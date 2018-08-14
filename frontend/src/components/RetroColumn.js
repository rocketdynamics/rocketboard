import React from "react";
import { compose, graphql } from "react-apollo";
import PropTypes from "prop-types";

import RetroCard from "./RetroCard";
import * as R from "ramda";

import { UPDATE_MESSAGE, GET_RETROSPECTIVE } from "../queries";

import { Droppable, Draggable } from "react-beautiful-dnd";
import { Button, List } from "antd";

class _RetroColumn extends React.Component {
    handleAdd = e => {
        e.preventDefault();
        if (this.props.onNewCard) {
            this.props.onNewCard("New Card");
        }
    };

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

    render() {
        const {
            cards,
            title,
            colour,
            grid,
            cardWidth,
            newVoteHandler,
        } = this.props;

        return (
            <div className="column">
                <div className="column-header">
                    <h3>{title}</h3>

                    <Button
                        onClick={this.handleAdd}
                        type="dashed"
                        icon="plus"
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
                            <List
                                footer={provided.placeholder}
                                grid={grid}
                                locale={{
                                    emptyText: "",
                                }}
                                dataSource={cards}
                                renderItem={item => (
                                    <Draggable
                                        key={`${title}-${item.id}`}
                                        draggableId={`${item.id}`}
                                        index={item.id}
                                    >
                                        {(provided, snapshot) => (
                                            <div
                                                className="card"
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                            >
                                                <List.Item>
                                                    <RetroCard
                                                        onMessageUpdated={
                                                            this
                                                                .handleMessageUpdated
                                                        }
                                                        data={item}
                                                        newVoteHandler={newVoteHandler}
                                                        cardWidth={cardWidth}
                                                        colour={colour}
                                                    />
                                                </List.Item>
                                            </div>
                                        )}
                                    </Draggable>
                                )}
                            />
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
    cardWidth: PropTypes.number,
};

export default compose(graphql(UPDATE_MESSAGE, { name: "updateMessage" }))(
    _RetroColumn
);
