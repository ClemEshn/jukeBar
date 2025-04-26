import { useEffect, useState } from "react";
import { PriceHistoryDTO } from "../../../models/Price-history";
import { io } from "socket.io-client";

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
type Drink = {
  pairId: number;
  drinkOneName: string;
  drinkTwoName: string;
  drinkOneInc : number;
  drinkOneDec : number;
  drinkTwoInc : number;
  drinkTwoDec : number;
};

export default function GenerateGraphTwo(props: DrinkPairProps) {
  const [prices, setPrices] = useState<PriceHistoryDTO[]>([]);
  const [priceChanges, setPriceChanges] = useState<Record<number, { drink1: string; drink2: string }>>({});
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const socketUrl = import.meta.env.SOCKET_URL;

  useEffect(() => {
    const socket = io(socketUrl, {
      path: "/socket.io/",
      transports: ["websocket"],
      withCredentials: true,
    });    
    socket.on("price-updates", (newPrice: PriceHistoryDTO) => {
      setPrices((prevPrices) => {
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

      setTimeout(() => {
        setPriceChanges((prevChanges) => ({
          ...prevChanges,
          [newPrice.pairId]: { drink1: "", drink2: "" },
        }));
      }, 500);
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
  }, [props.prices, props.drinks]);
  console.log(props.drinks);

  return (
    <div style={styles.container}>
      <table className={"g2table"}>
        <thead>
          <tr>
            <th colSpan={2} className={"g2header"}>Paires de boissons</th>
          </tr>
        </thead>
        <tbody>
  {prices.map((price) => {
    const changes = priceChanges[price.pairId] || { drink1: "", drink2: "" };
    const drink = drinks.find((drink) => drink.pairId == price.pairId);
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
