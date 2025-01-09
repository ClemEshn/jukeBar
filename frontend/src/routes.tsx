import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import Home from "./pages/home/Home";
import Login from "./pages/Login";
import Drinks from "./pages/drinks/Drinks";
import drinkLoader from "./pages/drinks/DrinkLoader";
import EventDetails from "./pages/events/components/eventDetails/EventDetails";
import BuyDrinks from "./pages/events/components/eventBuyDrinks/buyDrinks";

import { EventLoader, EventsLoader } from "./pages/events/components/EventLoader";

const router = createBrowserRouter([
  {
    path: '',
    element: <App />,
    children: [
      {
        path: '',
        element: <Home />,
        loader: EventsLoader
      },
      {
        path: 'drinks',
        element: <Drinks />,
        loader: drinkLoader
      },
      {
        path: 'events',
        children: [
          {
            path: 'pair/:eventId',
            element: <EventDetails/>,
            loader: EventLoader,
          },
          {
            path: 'manage/:eventId',
            element: <BuyDrinks/>,
            loader: EventLoader,
          }
        ]
      }
    ]
  },
  {
    path: 'login',
    element: <Login />
  }
]);

export default router;