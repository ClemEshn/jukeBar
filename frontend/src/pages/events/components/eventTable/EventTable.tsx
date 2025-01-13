import { Button, Table } from "react-bootstrap";
import { EventDTO } from "../../../../models/EventModels";
import { CaretRightSquareFill, CupStraw, CurrencyDollar, PlusSquare, XSquareFill } from 'react-bootstrap-icons';
import './EventTable.scss'
import { Link } from "react-router-dom";
import { createEvent } from "../../../../webservices/EventWebService";
import { useEffect, useState } from "react";
import { EVENT_TTL } from "../../../../const/const";


interface EventTableProps {
    events: EventDTO[]
}

export default function EventTable(props: EventTableProps) {
    const [events, setEvents] = useState<EventDTO[]>([]);

    useEffect(() => {
        setEvents(props.events);
    }, [props.events])

    const displayEvents = (events: EventDTO[]) => {
        (events);
        return events.map((event, index) => (
            <tr key={index}>
                <td>{event.id}</td>
                <td>{ new Date(event.createdAt).toLocaleDateString() }</td>
                <td className="text-center">{checkStatus(event)}</td>
                <td className="d-flex justify-content-center col">
                    <Link to={`events/pair/${event.id}`} className="btn btn-outline-primary"><CupStraw/></Link>
                    <p>&nbsp;</p>
                    <Link to={`events/manage/${event.id}`} className="btn btn-outline-primary"><CurrencyDollar/></Link>

                </td>
            </tr>
        ))
    }

    const checkStatus = (event: EventDTO) => {
        const eventDate = new Date(event.createdAt);
        if(eventDate > new Date(Date.now() - EVENT_TTL) && event.active == true) {
                return (<CaretRightSquareFill size={25} color="green"/>)
        }else{
                return (<XSquareFill size={25} color="red"/>)
        }
    }

    const onCreateEvent = async () => {
        const createdEvent = await createEvent();
        setEvents([createdEvent, ...events])
    }

    return (
        <>
            <div className="title d-flex justify-content-between">
                <h2>Evènements</h2>
                <Button className="d-flex event-create gap-2 align-items-center" onClick={onCreateEvent}>
                    Créer
                    <PlusSquare/>
                </Button>
            </div>
            <div className="event-list border rounded">
                <Table striped>
                    <thead>
                        <tr>
                            <th>Numéro</th>
                            <th>Date</th>
                            <th className="text-center">Status</th>
                            <th className="text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayEvents(events)}
                    </tbody>
                </Table>
            </div>
        </>
    )
}