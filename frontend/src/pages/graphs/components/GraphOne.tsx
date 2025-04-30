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

type drinks = {
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
  const [drinks, setDrinks] = useState<drinks[]>([]);
  const numberOfDrinks = useRef<number>(0);
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
      setPrices((prevPrices) => {
        const updatedPrices = [...prevPrices, newPrice];

        // Troncature par pairId
        const grouped = updatedPrices.reduce((acc, price) => {
          if (!acc[price.pairId]) acc[price.pairId] = [];
          acc[price.pairId].push(price);
          return acc;
        }, {} as Record<number, PriceHistoryDTO[]>);

        const truncatedGrouped = Object.fromEntries(
          Object.entries(grouped).map(([pairId, list]) => [
            pairId,
            list.slice(-NUMBER_OF_DATAPOINTS_TO_KEEP),
          ])
        );

        return Object.values(truncatedGrouped).flat();
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
    setDrinks(props.drinks || []);

    const sortedPrices = [...(props.prices || [])].sort(
      (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
    );

    const timestamps = Array.from(
      new Set(sortedPrices.map((p) => new Date(p.time).toISOString()))
    );

    const generatedLabels = timestamps.map((iso) => {
      const date = new Date(iso);
      const hours = date.getHours();
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${hours}:${minutes}`;
    });

    setLabels(generatedLabels);
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

    const dataset1 = {
      label: drinkPair?.drinkOneName || `Drink 1 - Pair ${pairId}`,
      data: pairPrices.map((price) => Number(price.price_drink_1)),
      borderColor: `hsl(${pairsColors[index]}, 70%, 50%)`,
      fill: false,
    };

    const dataset2 = {
      label: drinkPair?.drinkTwoName || `Drink 2 - Pair ${pairId}`,
      data: pairPrices.map((price) => Number(price.price_drink_2)),
      borderColor: `hsl(${pairsColors[index] + 60}, 70%, 50%)`,
      fill: false,
    };

    return [dataset1, dataset2];
  });

  const data = {
    labels,
    datasets,
  };

  return <Line options={GraphOneOptions} data={data} />;
}
