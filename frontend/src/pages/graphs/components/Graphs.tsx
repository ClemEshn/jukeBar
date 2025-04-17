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
  maxPrices: PriceHistoryDTO[];
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

type Drinks = {
  pairId: number;
  drinkOneName: string;
  drinkTwoName: string;
  drinkOneInc: number;
  drinkOneDec: number;
  drinkTwoInc: number;
  drinkTwoDec: number;
};

export default function GenerateGraphs(props: DrinkPairProps) {
  const [maxPrices, setMaxPrices] = useState<PriceHistoryDTO[]>([]);
  const [priceChanges, setPriceChanges] = useState<Record<number, { drink1: string; drink2: string }>>({});
  const [prices, setPrices] = useState<PriceHistoryDTO[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [drinks, setDrinks] = useState<Drinks[]>([]);
  const [existingLabels] = useState<string[]>([]);
  const [showTable, setShowTable] = useState(true);
  const numberOfDrinks = useRef<number>(0);
  const shiftLabels = useRef<boolean>(false);
  
  useEffect(() => {
    numberOfDrinks.current = props.drinks.length;
  }, [props.drinks]);

  useEffect(() => {
    const socket = io("https://jukebar.ovh", {
      path: "/socket.io/",
      transports: ["websocket"],
      withCredentials: true,
    });    
    socket.on("price-updates", (newPrice: PriceHistoryDTO) => {
    setPrices((prevPrices) => {
        const updatedPrices = [...prevPrices, newPrice];
        // replace with code to remove first data after a certain quantity
        if (updatedPrices.length > NUMBER_OF_DATAPOINTS_TO_KEEP * numberOfDrinks.current) {
          for(let i = 0;i++;i < NUMBER_OF_DATAPOINTS_TO_KEEP){
              updatedPrices.shift();
          }
          shiftLabels.current = true;
        }
        
        return updatedPrices;
      });
      setMaxPrices((prevPrices) => {
        const updatedPrices = prevPrices.map((price) => {
          if (price.pairId === newPrice.pairId) {
            const drink1Change = newPrice.price_drink_1 > price.price_drink_1 ? "up" : newPrice.price_drink_1 < price.price_drink_1 ? "down" : "";
            const drink2Change = newPrice.price_drink_2 > price.price_drink_2 ? "up" : newPrice.price_drink_2 < price.price_drink_2 ? "down" : "";
            setPriceChanges((prevChanges) => ({
              ...prevChanges,
              [price.pairId]: { drink1: drink1Change, drink2: drink2Change },
            }));

            return {
              ...price,
              price_drink_1: Math.round(newPrice.price_drink_1 * 100) / 100,
              price_drink_2: Math.round(newPrice.price_drink_2 * 100) / 100,
              time: newPrice.time,
            };
          }
          return price;
        });
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
          }
          return updatedLabel;
        }
        return prevLabels;
      });

      setTimeout(() => {
        setPriceChanges((prevChanges) => ({
          ...prevChanges,
          [newPrice.pairId]: { drink1: "", drink2: "" },
        }));
      }, 500);
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    setPrices(props.prices || []);
    setDrinks(props.drinks || []);
    setMaxPrices(props.maxPrices || []);
    const groupedLabels = (props.prices || []).filter(function(price){
      if(existingLabels.indexOf(String(price.time)) === -1){
        existingLabels.push(String(price.time));
        return true;
      }
      return false;
    });
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
    acc[price.pairId] = acc[price.pairId] || [];
    acc[price.pairId].push(price);
    return acc;
  }, {} as Record<number, PriceHistoryDTO[]>);

  const datasets = Object.entries(groupedPrices).flatMap(([pairId, pairPrices], index) => {
    const drinkPair = drinks.find((drink) => drink.pairId === Number(pairId));

    return [
      {
        label: drinkPair?.drinkOneName || `Drink 1 - Pair ${pairId}`,
        data: pairPrices.map((price) => price.price_drink_1),
        borderColor: `hsl(${pairsColors[index]}, 70%, 50%)`,
      },
      {
        label: drinkPair?.drinkTwoName || `Drink 2 - Pair ${pairId}`,
        data: pairPrices.map((price) => price.price_drink_2),
        borderColor: `hsl(${pairsColors[index] + 60}, 70%, 50%)`,
      },
    ];
  });

  const data = {
    labels,
    datasets,
  };
  useEffect(() => {
    const interval = setInterval(() => {
      setShowTable((prev) => !prev);
    }, 10000);

    return () => clearInterval(interval); // Clean up interval on component unmount
  }, []);
  return showTable ? (
    <div style={styles.container}>
      <table className={"g2table"}>
        <thead>
          <tr>
            <th colSpan={2} className={"g2header"}>
              Paires de boissons
            </th>
          </tr>
        </thead>
        <tbody>
          {maxPrices.map((price) => {
            const changes = priceChanges[price.pairId] || { drink1: "", drink2: "" };
            const drink = drinks.find((drink) => drink.pairId === price.pairId);
            return (
              <tr key={price.id}>
                <td className={"tableCell"}>
                  <div className="g2-cell-content">
                    <div className="priceUp">+ {drink?.drinkOneInc}</div>
                    <div>
                      <div className="drinkName">{drink?.drinkOneName}</div>
                      <div className={`price ${changes.drink1}`}>{String(price.price_drink_1).length === 3 ? price.price_drink_1 + "0" : price.price_drink_1}€</div>
                      </div>
                    <div className="priceDown">- {drink?.drinkOneDec}</div>
                  </div>
                </td>
                <td className={"tableCell"}>
                  <div className="g2-cell-content">
                    <div className="priceUp">+ {drink?.drinkTwoInc}</div>
                    <div>
                      <div className="drinkName">{drink?.drinkTwoName}</div>
                      <div className={`price ${changes.drink2}`}>{String(price.price_drink_2).length === 3 ? price.price_drink_2 + "0" : price.price_drink_2}€</div>
                      </div>
                    <div className="priceDown">- {drink?.drinkTwoDec}</div>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  ) : (
    <Line options={GraphOneOptions} data={data} />
  );
}

const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    width: "100vw",
  },
};
