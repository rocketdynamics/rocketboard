import React from "react";
import { Query, compose, graphql } from "react-apollo";
import * as R from "ramda";

import Column from "./RetroColumn";
import { DragDropContext } from "react-beautiful-dnd";

import {
    GET_RETROSPECTIVE,
    ADD_CARD,
    MOVE_CARD,
    NEW_VOTE,
    UPDATE_STATUS,
    CARD_SUBSCRIPTION,
} from "../queries";

const DEFAULT_BOARDS = ["Positive", "Mixed", "Negative"];
const IDX_SPACING = 2 ** 15;

const DEFAULT_COLOURS = {
    Positive: "#bae637",
    Mixed: "#ffa940",
    Negative: "#ff4d4f",
};

class _LiveRetrospective extends React.Component {
    onCardChanged = null;

    componentDidMount() {
        const { id } = this.props;
        this.onCardChanged = this.props.subscribe({
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
    }

    render() {
        return this.props.children;
    }
}

class _Retrospective extends React.Component {
    isSubscribed = false;

    getRetrospectiveId = () => {
        return R.path(["params", "id"], this.props.match);
    };

    handleAddCard = column => {
        return message => {
            const id = this.getRetrospectiveId();
            const newCard = { column, message };

            this.props.addCard({
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
                    const data = proxy.readQuery({
                        query: GET_RETROSPECTIVE,
                        variables: { id },
                    });

                    const columnIndexes = R.pipe(
                        R.pluck("position"),
                        R.filter(R.propEq("column", column))
                    );
                    const maxIndex = Math.max(
                        0,
                        ...columnIndexes(data.retrospectiveById.cards)
                    );
                    data.retrospectiveById.cards.push({
                        __typename: "Card",
                        id: addCardToRetrospective,
                        creator: "Unknown",
                        votes: [],
                        statuses: [],
                        position: maxIndex + IDX_SPACING,
                        ...newCard,
                    });

                    proxy.writeQuery({
                        query: GET_RETROSPECTIVE,
                        variables: { id },
                        data,
                    });
                },
            });
        };
    };

    cardDragUpdate = ({ draggableId, destination, source, ...args }) => {
        const cardElem = document.querySelector(`#card-${draggableId}`);
        if (destination) {
            cardElem.style.borderTopColor =
                DEFAULT_COLOURS[destination.droppableId];
        } else {
            cardElem.style.borderTopColor = DEFAULT_COLOURS[source.droppableId];
        }
    };

    handleMoveCard = result => {
        const id = this.getRetrospectiveId();

        const { draggableId, destination } = result;
        if (!destination) {
            return;
        }

        const cardId = draggableId;
        const column = destination.droppableId;

        this.props.moveCard({
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
                const data = proxy.readQuery({
                    query: GET_RETROSPECTIVE,
                    variables: { id },
                });
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

    handleNewVote = cardId => {
        return () => {
            const id = this.getRetrospectiveId();

            this.props.newVote({
                variables: {
                    cardId,
                },
                optimisticResponse: {
                    __typename: "Mutation",
                    newVote: {
                        __typename: "Vote",
                        count: 1,
                        voter: Math.random(),
                    },
                },
                update: (proxy, { data: { newVote } }) => {
                    const data = proxy.readQuery({
                        query: GET_RETROSPECTIVE,
                        variables: { id },
                    });

                    const existingCards = data.retrospectiveById.cards;
                    const targetCardIndex = R.findIndex(R.propEq("id", cardId))(
                        existingCards
                    );
                    const card = existingCards[targetCardIndex];
                    const targetVoteIndex = R.findIndex(
                        R.propEq("voter", newVote.voter)
                    )(card.votes);
                    var vote = card.votes[targetVoteIndex];
                    if (vote === undefined) {
                        vote = newVote;
                        card.votes.push(newVote);
                    }
                    vote.count = newVote.count;
                    proxy.writeQuery({
                        query: GET_RETROSPECTIVE,
                        variables: { id },
                        data,
                    });
                },
            });
        };
    };

    handleSetStatus = (status, cardId) => {
        return () => {
            const id = this.getRetrospectiveId();
            this.props.updateStatus({
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
                    const data = proxy.readQuery({
                        query: GET_RETROSPECTIVE,
                        variables: { id },
                    });

                    const existingCards = data.retrospectiveById.cards;
                    const targetCardIndex = R.findIndex(R.propEq("id", cardId))(
                        existingCards
                    );

                    const card = existingCards[targetCardIndex];
                    card.statuses = [...card.statuses, updateStatus];

                    proxy.writeQuery({
                        query: GET_RETROSPECTIVE,
                        variables: { id },
                        data,
                    });
                },
            });
        };
    };

    getCards = columnName => {
        return R.pipe(
            R.pathOr([], ["retrospectiveById", "cards"]),
            R.filter(R.propEq("column", columnName))
        );
    };

    render() {
        const id = this.getRetrospectiveId();
        return (
            <Query query={GET_RETROSPECTIVE} variables={{ id }}>
                {({ loading, error, data, subscribeToMore }) => {
                    if (loading) {
                        return (
                            <h2>
                                Preparing for Take-Off{" "}
                                <span role="img" aria-label="rocket">
                                    🚀
                                </span>
                            </h2>
                        );
                    }

                    if (!R.prop(["retrospectiveById"], data)) {
                        return (
                            <h2>
                                Rocketboard not found{" "}
                                <span role="img" aria-label="broken heart">
                                    💔
                                </span>
                            </h2>
                        );
                    }

                    return (
                        <div className="page-retrospective">
                            <_LiveRetrospective
                                id={id}
                                subscribe={subscribeToMore}
                            >
                                <DragDropContext
                                    onDragEnd={this.handleMoveCard}
                                    onDragUpdate={this.cardDragUpdate}
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
                                                        this.handleNewVote
                                                    }
                                                    onNewCard={this.handleAddCard(
                                                        columnName
                                                    )}
                                                    onSetStatus={
                                                        this.handleSetStatus
                                                    }
                                                    cards={this.getCards(
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
                }}
            </Query>
        );
    }
}

export default compose(
    graphql(ADD_CARD, { name: "addCard" }),
    graphql(MOVE_CARD, { name: "moveCard" }),
    graphql(NEW_VOTE, { name: "newVote" }),
    graphql(UPDATE_STATUS, { name: "updateStatus" })
)(_Retrospective);
