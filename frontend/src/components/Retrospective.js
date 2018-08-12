import React from "react";
import gql from "graphql-tag";
import { Query, Mutation } from "react-apollo";
import * as R from "ramda";

import Column from "./RetroColumn";
import { DragDropContext } from "react-beautiful-dnd";

const GET_RETROSPECTIVE = gql`
    query GetRetrospective($id: ID!) {
        retrospectiveById(id: $id) {
            id
            name
            created
            updated
            columns {
                name
                cards {
                    id
                    message
                }
            }
        }
    }
`;

const ADD_CARD = gql`
    mutation AddCard($id: ID!, $column: String!, $message: String!) {
        addCardToRetrospective(id: $id, column: $column, message: $message) {
            id
            message
        }
    }
`;

const MOVE_CARD = gql`
    mutation MoveCard($id: ID!, $column: String!) {
        moveCard(id: $id, column: $column) {
            id
            column
            message
        }
    }
`;

const DEFAULT_BOARDS = ["Positive", "Mixed", "Negative"];

const DEFAULT_COLOURS = {
    "Positive": "#006d00",
    "Mixed": "#d18400",
    "Negative": "#bc0000",
};

const Retrospective = ({ match }) => {
    const id = R.path(["params", "id"], match);

    return (
        <Query query={GET_RETROSPECTIVE} variables={{ id }}>
            {({ loading, error, data }) => {
                if (loading) {
                    return <h3>Preparing for Take-Off 🚀</h3>;
                }

                if (!R.prop(["retrospectiveById"], data)) {
                    return <h3>Rocketboard not found 💔</h3>;
                }

                return (
                    <Mutation mutation={ADD_CARD}>
                        {(addCard, { loading }) => {
                            const handleNewCard = column => {
                                return message => {
                                    addCard({
                                        variables: {
                                            id,
                                            column,
                                            message,
                                        },
                                        optimisticResponse: {
                                            __typename: "Mutation",
                                            addCardToRetrospective: {
                                                __typename: "Card",
                                                id: "unknown",
                                                message,
                                            },
                                        },
                                        update: (
                                            proxy,
                                            { data: { addCardToRetrospective } }
                                        ) => {
                                            const data = proxy.readQuery({
                                                query: GET_RETROSPECTIVE,
                                                variables: { id },
                                            });
                                            const getColumnIndex = R.findIndex(
                                                R.propEq("name", column)
                                            );
                                            if (
                                                getColumnIndex(
                                                    data.retrospectiveById
                                                        .columns
                                                ) === -1
                                            ) {
                                                data.retrospectiveById.columns.push(
                                                    {
                                                        __typename: "Column",
                                                        name: column,
                                                        cards: [],
                                                    }
                                                );
                                            }
                                            data.retrospectiveById.columns[
                                                getColumnIndex(
                                                    data.retrospectiveById
                                                        .columns
                                                )
                                            ].cards.push(
                                                addCardToRetrospective
                                            );
                                            proxy.writeQuery({
                                                query: GET_RETROSPECTIVE,
                                                data,
                                            });
                                        },
                                    });
                                };
                            };

                            const getCards = column => {
                                return R.pipe(
                                    R.pathOr(
                                        [],
                                        ["retrospectiveById", "columns"]
                                    ),
                                    R.find(R.propEq("name", column)),
                                    R.propOr([], "cards")
                                );
                            };
                            return (
                                <div className="page-board">
                                    <Mutation mutation={MOVE_CARD}>
                                        {(moveCard, { loading }) => {
                                            const onDragEnd = (result) => {
                                                const { draggableId, source, destination } = result;

                                                if (destination === null) {
                                                    return;
                                                }

                                                const cardId = draggableId;
                                                const column = destination.droppableId;
                                                const sourceColumn = source.droppableId;

                                                moveCard({
                                                    variables: {
                                                        id: cardId,
                                                        column,
                                                    },
                                                    optimisticResponse: {
                                                        __typename: "Mutation",
                                                        moveCard: {
                                                            __typename: "Card",
                                                            id: "unknown",
                                                            column,
                                                            message: "...",
                                                        },
                                                    },
                                                    update: (
                                                        proxy,
                                                        { data: { moveCard } }
                                                    ) => {
                                                        const data = proxy.readQuery({
                                                            query: GET_RETROSPECTIVE,
                                                            variables: { id },
                                                        });
                                                        const getColumnIndex = (column) => R.findIndex(
                                                            R.propEq("name", column)
                                                        );
                                                        const removeCard = (cardId, column) => {
                                                            column.cards = R.filter(
                                                                R.complement(R.propEq("id", cardId)),
                                                                column.cards
                                                            );
                                                        };
                                                        if (
                                                            getColumnIndex(column)(
                                                                data.retrospectiveById
                                                                    .columns
                                                            ) === -1
                                                        ) {
                                                            data.retrospectiveById.columns.push(
                                                                {
                                                                    __typename: "Column",
                                                                    name: column,
                                                                    cards: [],
                                                                }
                                                            );
                                                        }
                                                        removeCard(cardId, data.retrospectiveById.columns[
                                                            getColumnIndex(sourceColumn)(data.retrospectiveById.columns)
                                                        ])

                                                        data.retrospectiveById.columns[
                                                            getColumnIndex(column)(
                                                                data.retrospectiveById
                                                                    .columns
                                                            )
                                                        ].cards.push(
                                                            moveCard
                                                        );
                                                        proxy.writeQuery({
                                                            query: GET_RETROSPECTIVE,
                                                            data,
                                                        });
                                                    },
                                                });
                                            };
                                            return (
                                                <DragDropContext onDragEnd={onDragEnd}>
                                                {DEFAULT_BOARDS.map(name => {
                                                    const colour = DEFAULT_COLOURS[name];
                                                    return <Column
                                                        isLoading={loading}
                                                        key={name}
                                                        title={name}
                                                        colour={colour}
                                                        onNewCard={handleNewCard(name)}
                                                        cards={getCards(name)(data)}
                                                    />
                                                })}
                                                </DragDropContext>
                                            );
                                        }}
                                    </Mutation>
                                </div>
                            );
                        }}
                    </Mutation>
                );
            }}
        </Query>
    );
};

export default Retrospective;
