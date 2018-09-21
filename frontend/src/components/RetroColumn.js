import React from "react";
import { compose, graphql } from "react-apollo";
import PropTypes from "prop-types";

import RetroCard from "./RetroCard";
import * as R from "ramda";

import { UPDATE_MESSAGE, GET_RETROSPECTIVE } from "../queries";

import { Droppable, Draggable } from "react-beautiful-dnd";
import { Button } from "antd";

class _RetroColumn extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            newCard: undefined,
        };
    }

    handleAdd = e => {
        e.preventDefault();
        this.setState({
            newCard: {
                id: "newCard",
                message: "",
                votes: [],
                statuses: [],
                isNew: true,
            }
        });
    };

    handleNewCardUpdated = ({ cardId, message }) => {
        this.setState({newCard: undefined});
        if (this.props.onNewCard && message !== "") {
            this.props.onNewCard(message);
        }
    }

    handleMessageUpdated = ({ cardId, message }) => {
        this.props.updateMessage({
            variables: {
                id: cardId,
                message,
            },
            optimisticResponse: {
                __typename: "Mutation",
                updateMessage: message,
            },
            update: (proxy, { data: { updateMessage } }) => {
                const data = proxy.readQuery({
                    query: GET_RETROSPECTIVE,
                    variables: { id: this.props.retrospectiveId },
                });

                const existingCards = data.retrospectiveById.cards;
                const targetCardIndex = R.findIndex(R.propEq("id", cardId))(
                    existingCards
                );
                existingCards[targetCardIndex].message = updateMessage;

                proxy.writeQuery({
                    query: GET_RETROSPECTIVE,
                    variables: { id: this.props.retrospectiveId },
                    data,
                });
            },
        });
    };

    shouldComponentUpdate(nextProps, nextState) {
        // Update if cards or state changes
        return !(
            R.equals(nextProps.cards, this.props.cards) && R.equals(nextState, this.state)
        )
    }

    render() {
        const { title, colour, onNewVote, onSetStatus } = this.props;
        // Defensive copy of cards to allow us to push the new card
        const cards = this.props.cards.slice();
        if (this.state.newCard !== undefined) {
            cards.unshift(this.state.newCard);
        }

        return (
            <div className="column">
                <div className="column-header">
                    <h3>{title}</h3>

                    <Button
                        onClick={this.handleAdd}
                        type="dashed"
                        icon="plus"
                        disabled={this.state.newCard !== undefined}
                        block
                    />
                </div>

                <Droppable droppableId={title}>
                    {(provided, snapshot) => (
                        <div
                            className="column-cards"
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                        >
                            {cards.map((item, index) => (
                                <Draggable
                                    key={`${title}-${item.id}`}
                                    draggableId={`${item.id}`}
                                    index={index}
                                >
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                        >
                                            <RetroCard
                                                onMessageUpdated={
                                                    item.isNew ?
                                                        this.handleNewCardUpdated :
                                                        this.handleMessageUpdated
                                                }
                                                isDragging={snapshot.isDragging}
                                                data={item}
                                                onNewVote={onNewVote}
                                                onSetStatus={onSetStatus}
                                                colour={colour}
                                                isNew={item.isNew === true}
                                            />
                                        </div>
                                    )}
                                </Draggable>
                            ))}
                            <div>{provided.placeholder}</div>
                        </div>
                    )}
                </Droppable>
            </div>
        );
    }
}

_RetroColumn.propTypes = {
    title: PropTypes.string.isRequired,
    colour: PropTypes.string.isRequired,
    layout: PropTypes.string,
};

export default compose(graphql(UPDATE_MESSAGE, { name: "updateMessage" }))(
    _RetroColumn
);
