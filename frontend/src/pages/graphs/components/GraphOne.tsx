import { useEffect, useRef, useState } from "react";
import { Line } from "react-chartjs-2";
import { io, Socket } from "socket.io-client";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { GraphOneOptions, pairsColors } from "./GraphOneOptions";
import { PriceHistoryDTO } from "../../../models/Price-history";
import { NUMBER_OF_DATAPOINTS_TO_KEEP } from "../../../const/const";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface DrinkPairProps {
  prices: PriceHistoryDTO[];
  drinks:{
    pairId: number;
    drinkOneName: string;
    drinkTwoName: string;
    drinkOneInc : number;
    drinkOneDec : number;
    drinkTwoInc : number;
    drinkTwoDec : number;
  }[]
}
type drinks = {
  pairId: number;
  drinkOneName: string;
  drinkTwoName: string;
  drinkOneInc : number;
  drinkOneDec : number;
  drinkTwoInc : number;
  drinkTwoDec : number;
};


export default function GenerateGraphOne(props: DrinkPairProps) {
  const [prices, setPrices] = useState<PriceHistoryDTO[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [drinks, setdrinks] = useState<drinks[]>([]);
  const [existingLabels] = useState<string[]>([]);
  const numberOfDrinks = useRef<number>(0);
  const shiftLabels = useRef<boolean>(false);

  useEffect(() => {
    numberOfDrinks.current = props.drinks.length;
  }, [props.drinks]);

  useEffect(() => {
    const socket = io("http://localhost:5201",{
    // const socket = io("https://jukebar.ovh", {
      path: "/socket.io/",
      transports: ["websocket"],
      withCredentials: true,
    });    
    socket.on("price-updates", (newPrice: PriceHistoryDTO) => {
      setPrices((prevPrices) => {
        console.log(prevPrices);
        const updatedPrices = [...prevPrices, newPrice];
        console.log(updatedPrices);
        if (updatedPrices.length > NUMBER_OF_DATAPOINTS_TO_KEEP * numberOfDrinks.current) {
          for(let i = 0;i++;i < NUMBER_OF_DATAPOINTS_TO_KEEP){
            updatedPrices.shift();
          }
          shiftLabels.current = true;
        }
        
        return updatedPrices;
      });
      setLabels((prevLabels) => {
        const newDate = new Date(newPrice.time);
        var minutes = String(newDate.getMinutes());
        if(Number(minutes) < 10){
          minutes = "0" + newDate.getMinutes();
        }
        const newLabel =  `${newDate.getHours()}:${minutes}`;
    
        if(existingLabels.indexOf(String(newDate)) === -1){
          const updatedLabel = [...prevLabels, newLabel];
          existingLabels.push(String(newDate));
          if(shiftLabels.current === true){
            shiftLabels.current = false;
            updatedLabel.shift();
          //   // setUpdatedGraph(updatedGraph + 0);
          }
          return updatedLabel;
        }
        return prevLabels;
      });
      
    });
       
    socket.on("connect", () => {
      console.log("Socket connected successfully:", socket.id);
    });

    socket.on("connect_error", (err) => {
      console.error("Connection error:", err.message);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    setPrices(props.prices || []);
    setdrinks(props.drinks || []);
    const groupedLabels = (props.prices || []).filter(function(price){
      if(existingLabels.indexOf(String(price.time)) === -1){
        existingLabels.push(String(price.time));
        return true;
      }
      return false;
    });
    console.log(props.drinks, drinks);

    const initialLabels = (groupedLabels).map((price) => {
      const date = new Date(price.time);
      var minutes = String(date.getMinutes());
      if(Number(minutes) < 10){
        minutes = "0" + date.getMinutes();
      }
      return `${date.getHours()}:${minutes}`;
    });

    setLabels(initialLabels);
  }, [props.prices, props.drinks]);

  const groupedPrices = prices.reduce((acc, price) => {
    const { pairId } = price;
    if (!acc[pairId]) {
      acc[pairId] = [];
    }
    acc[pairId].push(price);
    return acc;
  }, {} as Record<number, PriceHistoryDTO[]>);

  const datasets = Object.entries(groupedPrices).flatMap(([pairId, pairPrices], index) => {
    const drinkPair = drinks.find((drink) => drink.pairId == Number(pairId));

    const dataset1 = {
      label: drinkPair?.drinkOneName || `Drink 1 - Pair ${pairId}`,
      data: pairPrices.map((price) => price.price_drink_1),
      borderColor: `hsl(${pairsColors[index]}, 70%, 50%)`,
    };

    const dataset2 = {
      label: drinkPair?.drinkTwoName || `Drink 2 - Pair ${pairId}`,
      data: pairPrices.map((price) => price.price_drink_2),
      borderColor: `hsl(${pairsColors[index] + 60}, 70%, 50%)`,
    };
    return [dataset1, dataset2];
  });
  const data = {
    labels,
    datasets,
  };
  return <Line options={GraphOneOptions} data={data} />;
}
