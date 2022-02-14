import React, { useEffect } from "react";
import { graphql } from '@apollo/client/react/hoc';
import { useQuery } from "@apollo/client";
import { flowRight, clone, cloneDeep } from "lodash";
import * as R from "ramda";

import Column from "./RetroColumn";
import { DragDropContext } from "react-beautiful-dnd";

import {
    GET_RETROSPECTIVE,
    ADD_CARD,
    MOVE_CARD,
    NEW_VOTE,
    UPDATE_STATUS,
    SEND_HEARTBEAT,
    CARD_SUBSCRIPTION,
    RETRO_SUBSCRIPTION,
} from "../queries";

const DEFAULT_BOARDS = ["Positive", "Mixed", "Negative"];
const IDX_SPACING = 2 ** 15;

const DEFAULT_COLOURS = {
    Positive: "#bae637",
    Mixed: "#ffa940",
    Negative: "#ff4d4f",
};

function _LiveRetrospective(props) {
    var onCardChanged = null;
    var onRetroChanged = null;

    useEffect(() => {
        const { id } = props;
        onRetroChanged = props.subscribe({
            document: RETRO_SUBSCRIPTION,
            variables: { rId: id },
        });
        onCardChanged = props.subscribe({
            document: CARD_SUBSCRIPTION,
            variables: { rId: id },
            updateQuery: (prev, { subscriptionData: { data } }) => {
                const newCard = data.cardChanged;
                var existingCards = prev.retrospectiveById.cards;

                if (!R.find(R.propEq("id", newCard.id))(existingCards)) {
                    existingCards= [...existingCards, newCard]
                }

                return {
                    ...prev,
                    retrospectiveById: {
                        ...prev.retrospectiveById,
                        cards: R.sortBy(
                            R.prop("position"),
                            existingCards
                        ),
                    },
                };
            },
        });
    });

    return props.children;
}

function _Retrospective(props) {
    var isSubscribed = false;
    var heartbeatInterval = null;
    var doHeartbeat = null;

    const getRetrospectiveId = () => {
        return props.id;
    };

    useEffect(() => {
        const id = getRetrospectiveId();
        doHeartbeat = () => {
            const state = {
                "visible": "Visible",
                "hidden": "Hidden",
            }[document.visibilityState] || "Unknown";
            props.sendHeartbeat({
                variables: {
                    rId: id,
                    state: state,
                }
            })
        };
        document.addEventListener("visibilitychange", doHeartbeat);
        heartbeatInterval = setInterval(doHeartbeat, 5000);
        doHeartbeat();

        return () => {
            clearTimeout(heartbeatInterval);
            document.removeEventListener("visibilitychange", doHeartbeat);
        }
    });

    const handleAddCard = column => {
        return message => {
            const id = getRetrospectiveId();
            const newCard = { column, message };

            props.addCard({
                variables: {
                    id,
                    ...newCard,
                },
                optimisticResponse: {
                    __typename: "Mutation",
                    addCardToRetrospective: Math.random()
                        .toString()
                        .substr(2),
                },
                update: (proxy, { data: { addCardToRetrospective } }) => {
                    const data = cloneDeep(proxy.readQuery({
                        query: GET_RETROSPECTIVE,
                        variables: { id },
                    }));

                    const columnIndexes = R.pipe(
                        R.pluck("position"),
                        R.filter(R.propEq("column", column))
                    );
                    const minIndex = Math.min(
                        0,
                        ...columnIndexes(data.retrospectiveById.cards)
                    );
                    data.retrospectiveById.cards.unshift({
                        __typename: "Card",
                        id: addCardToRetrospective,
                        creator: "",
                        votes: [],
                        statuses: [],
                        position: minIndex - IDX_SPACING,
                        ...newCard,
                    });

                    proxy.writeQuery({
                        query: GET_RETROSPECTIVE,
                        variables: { id },
                        data: data,
                    });
                },
            });
        };
    };

    const cardDragUpdate = ({ draggableId, destination, source, ...args }) => {
        const cardElem = document.querySelector(`#card-${draggableId}`);
        if (destination) {
            cardElem.style.borderTopColor =
                DEFAULT_COLOURS[destination.droppableId];
        } else {
            cardElem.style.borderTopColor = DEFAULT_COLOURS[source.droppableId];
        }
    };

    const handleMoveCard = result => {
        const id = getRetrospectiveId();

        const { draggableId, destination } = result;
        if (!destination) {
            return;
        }

        const cardId = draggableId;
        const column = destination.droppableId;

        props.moveCard({
            variables: {
                id: cardId,
                column,
                index: destination.index,
            },
            optimisticResponse: {
                __typename: "Mutation",
                moveCard: { index: destination.index },
            },
            update: (proxy, { data: { moveCard } }) => {
                const data = cloneDeep(proxy.readQuery({
                    query: GET_RETROSPECTIVE,
                    variables: { id },
                }));
                const existingCards = data.retrospectiveById.cards;
                const targetCardIndex = R.findIndex(R.propEq("id", cardId))(
                    existingCards
                );
                existingCards[targetCardIndex].column = column;
                const columnCards = R.filter(
                    R.propEq("column", column),
                    data.retrospectiveById.cards
                );
                const otherCards = R.filter(c => c.id !== cardId, columnCards);

                var position = moveCard;
                if (moveCard.index !== undefined) {
                    if (otherCards.length === 0) {
                        position = IDX_SPACING;
                    } else if (moveCard.index >= otherCards.length) {
                        position =
                            otherCards[otherCards.length - 1].position +
                            IDX_SPACING;
                    } else if (otherCards[moveCard.index].id === cardId) {
                        position = otherCards[moveCard.index].position;
                    } else if (moveCard.index === 0) {
                        position = otherCards[0].position - IDX_SPACING;
                    } else {
                        position =
                            Math.floor(
                                otherCards[moveCard.index].position +
                                    otherCards[moveCard.index - 1].position
                            ) / 2;
                    }
                }
                existingCards[targetCardIndex].position = position;
                data.retrospectiveById.cards = R.sortBy(
                    R.prop("position"),
                    existingCards
                );
                proxy.writeQuery({
                    query: GET_RETROSPECTIVE,
                    variables: { id },
                    data,
                });
            },
        });
    };

    const handleNewVote = (cardId, emoji) => {
        return () => {
            const id = getRetrospectiveId();

            props.newVote({
                variables: {
                    cardId,
                    emoji,
                },
                optimisticResponse: {
                    __typename: "Mutation",
                    newVote: {
                        __typename: "Vote",
                        count: 1,
                        voter: Math.random(),
                        emoji: emoji,
                    },
                },
                update: (proxy, { data: { newVote } }) => {
                    const data = cloneDeep(proxy.readQuery({
                        query: GET_RETROSPECTIVE,
                        variables: { id },
                    }));

                    const existingCards = data.retrospectiveById.cards;
                    const targetCardIndex = R.findIndex(R.propEq("id", cardId))(
                        existingCards
                    );
                    const card = existingCards[targetCardIndex];
                    const targetVoteIndex = R.findIndex(
                        R.both(R.propEq("emoji", newVote.emoji), R.propEq("voter", newVote.voter))
                    )(card.votes);
                    var vote = card.votes[targetVoteIndex];
                    if (vote === undefined) {
                        vote = cloneDeep(newVote);
                        card.votes.push(newVote);
                    }
                    vote.count = newVote.count;
                    proxy.writeQuery({
                        query: GET_RETROSPECTIVE,
                        variables: { id },
                        data: data,
                    });
                },
            });
        };
    };

    const handleSetStatus = (status, cardId) => {
        return () => {
            const id = getRetrospectiveId();
            props.updateStatus({
                variables: {
                    id: cardId,
                    status,
                },
                optimisticResponse: {
                    __typename: "Mutation",
                    updateStatus: {
                        __typename: "Status",
                        id: Math.random(),
                        created: new Date(),
                        cardId,
                        type: status,
                    },
                },
                update: (proxy, { data: { updateStatus } }) => {
                    const data = cloneDeep(proxy.readQuery({
                        query: GET_RETROSPECTIVE,
                        variables: { id },
                    }));

                    const existingCards = [...data.retrospectiveById.cards];
                    const targetCardIndex = R.findIndex(R.propEq("id", cardId))(
                        existingCards
                    );

                    const card = existingCards[targetCardIndex];
                    card.statuses = [...card.statuses, updateStatus];

                    proxy.writeQuery({
                        query: GET_RETROSPECTIVE,
                        variables: { id },
                        data: data,
                    });
                },
            });
        };
    };

    const getCards = columnName => {
        return R.pipe(
            R.pathOr([], ["retrospectiveById", "cards"]),
            R.filter(R.propEq("column", columnName))
        );
    };

    const id = getRetrospectiveId();

    var { loading, error, data, subscribeToMore } = useQuery(GET_RETROSPECTIVE, {
        variables: { id },
    });

    if (data === undefined) {
        data = {};
    }

    if (!R.prop(["retrospectiveById"], data)) {
        data.retrospectiveById = {};
    }

    useEffect(() => {
        if (props.setOnlineUsersHolder.setOnlineUsers && data.retrospectiveById.onlineUsers) {
            props.setOnlineUsersHolder.setOnlineUsers(data.retrospectiveById.onlineUsers);
        }
    });

    if (error) {
        return (
            <div>Error</div>
        )
    }

    return (
        <div className="page-retrospective">
            <div className={"retrospective-loading" + (loading ? "" : " loading-finished")}>
                <pre className="loading-text">
                    R  O  C  K  E  T  B  O  A  R  D
                </pre>
            </div>
            <_LiveRetrospective
                id={id}
                subscribe={subscribeToMore}
            >
                <DragDropContext
                    onDragEnd={handleMoveCard}
                    onDragUpdate={cardDragUpdate}
                >
                    <div className="columns-wrapper">
                        {DEFAULT_BOARDS.map(columnName => {
                            return (
                                <Column
                                    key={columnName}
                                    retrospectiveId={id}
                                    isLoading={loading}
                                    title={columnName}
                                    colour={
                                        DEFAULT_COLOURS[
                                            columnName
                                        ]
                                    }
                                    onNewVote={
                                        handleNewVote
                                    }
                                    onNewCard={handleAddCard(
                                        columnName
                                    )}
                                    onSetStatus={
                                        handleSetStatus
                                    }
                                    cards={getCards(
                                        columnName
                                    )(data)}
                                />
                            );
                        })}
                    </div>
                </DragDropContext>
            </_LiveRetrospective>
        </div>
    );
}

export default flowRight(
    graphql(ADD_CARD, { name: "addCard" }),
    graphql(MOVE_CARD, { name: "moveCard" }),
    graphql(NEW_VOTE, { name: "newVote" }),
    graphql(UPDATE_STATUS, { name: "updateStatus" }),
    graphql(SEND_HEARTBEAT, { name: "sendHeartbeat" })
)(_Retrospective);
