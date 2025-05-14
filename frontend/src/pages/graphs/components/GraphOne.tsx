import { useEffect, useRef, useState } from "react";
import { Line } from "react-chartjs-2";
import { io } from "socket.io-client";
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
import { GraphOneOptions, pairsColors, pairsColors2 } from "./GraphOneOptions";
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
  drinks: {
    pairId: number;
    drinkOneName: string;
    drinkTwoName: string;
    drinkOneInc: number;
    drinkOneDec: number;
    drinkTwoInc: number;
    drinkTwoDec: number;
  }[];
}

type Drink = {
  pairId: number;
  drinkOneName: string;
  drinkTwoName: string;
  drinkOneInc: number;
  drinkOneDec: number;
  drinkTwoInc: number;
  drinkTwoDec: number;
};

export default function GenerateGraphOne(props: DrinkPairProps) {
  const [prices, setPrices] = useState<PriceHistoryDTO[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const existingLabels = useRef<string[]>([]);
  const numberOfDrinks = useRef<number>(0);
  const shiftLabels = useRef<boolean>(false);
  const socketUrl = import.meta.env.VITE_SOCKET_URL;

  useEffect(() => {
    numberOfDrinks.current = props.drinks.length;
  }, [props.drinks]);

  useEffect(() => {
    const socket = io(socketUrl, {
      path: "/socket.io/",
      transports: ["websocket"],
      withCredentials: false,
    });

    socket.on("price-updates", (newPrice: PriceHistoryDTO) => {
      // Convert string prices to numbers
      const processedPrice = {
        ...newPrice,
        price_drink_1: Number(newPrice.price_drink_1),
        price_drink_2: Number(newPrice.price_drink_2),
      };

      setPrices((prevPrices) => {
        const updatedPrices = [...prevPrices, processedPrice];
        
        if (updatedPrices.length > NUMBER_OF_DATAPOINTS_TO_KEEP * numberOfDrinks.current) {
          const toRemove = updatedPrices.length - NUMBER_OF_DATAPOINTS_TO_KEEP * numberOfDrinks.current;
          updatedPrices.splice(0, toRemove);
          shiftLabels.current = true;
        }
        
        return updatedPrices;
      });

      setLabels((prevLabels) => {
        const newDate = new Date(newPrice.time);
        const minutes = String(newDate.getMinutes()).padStart(2, '0');
        const newLabel = `${newDate.getHours()}:${minutes}`;
    
        if (!existingLabels.current.includes(String(newDate))) {
          const updatedLabel = [...prevLabels, newLabel];
          existingLabels.current.push(String(newDate));
          
          if (shiftLabels.current) {
            shiftLabels.current = false;
            updatedLabel.shift();
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
    // Process initial data
    const processedPrices = (props.prices || []).map(price => ({
      ...price,
      price_drink_1: Number(price.price_drink_1),
      price_drink_2: Number(price.price_drink_2),
    }));

    setPrices(processedPrices);
    setDrinks(props.drinks || []);

    const initialLabels = (props.prices || [])
      .filter(price => {
        if (!existingLabels.current.includes(String(price.time))) {
          existingLabels.current.push(String(price.time));
          return true;
        }
        return false;
      })
      .map(price => {
        const date = new Date(price.time);
        const minutes = String(date.getMinutes()).padStart(2, '0');
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
    const drinkPair = drinks.find((drink) => drink.pairId === Number(pairId));
    const colorIndex = index % pairsColors.length;

    return [
      {
        label: drinkPair?.drinkOneName || `Drink 1 - Pair ${pairId}`,
        data: pairPrices.map((price) => price.price_drink_1),
        borderColor: `hsl(${pairsColors[colorIndex]}, 70%, 50%)`,
        backgroundColor: 'transparent',
        tension: 0.1,
        fill: false,
      },
      {
        label: drinkPair?.drinkTwoName || `Drink 2 - Pair ${pairId}`,
        data: pairPrices.map((price) => price.price_drink_2),
        borderColor: `hsl(${(pairsColors2[colorIndex])}, 70%, 50%)`,
        backgroundColor: 'transparent',
        tension: 0.1,
        fill: false,
      }
    ];
  });

  const data = {
    labels,
    datasets,
  };

  return <Line options={GraphOneOptions} data={data} />;
}