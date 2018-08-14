import React from "react";
import { Query, compose, graphql } from "react-apollo";
import * as R from "ramda";

import Column from "./RetroColumn";
import { DragDropContext } from "react-beautiful-dnd";

import { GET_RETROSPECTIVE, ADD_CARD, MOVE_CARD, NEW_VOTE, CARD_SUBSCRIPTION } from "../queries";

const DEFAULT_BOARDS = ["Positive", "Mixed", "Negative"];

const DEFAULT_COLOURS = {
    Positive: "#bae637",
    Mixed: "#ffa940",
    Negative: "#ff4d4f",
};

export class Retro extends React.Component {
  componentDidMount() {
    this.props.subscribeToNewComments();
  }

  render() {
    return (
        <div className={this.props.className}>
            {this.props.children}
        </div>
    )
  }
}

class _Retrospective extends React.Component {
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
                    addCardToRetrospective: "pending-id",
                },
                update: (proxy, { data: { addCardToRetrospective } }) => {
                    const data = proxy.readQuery({
                        query: GET_RETROSPECTIVE,
                        variables: { id },
                    });

                    data.retrospectiveById.cards.push({
                        __typename: "Card",
                        id: addCardToRetrospective,
                        votes: [],
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

    handleMoveCard = result => {
        const id = this.getRetrospectiveId();

        const { draggableId, destination, source } = result;
        if (!destination) {
            return;
        }

        const cardId = draggableId;
        const originalColumn = source.droppableId;
        const column = destination.droppableId;

        if (originalColumn === column) {
            return;
        }

        this.props.moveCard({
            variables: {
                id: cardId,
                column,
            },
            optimisticResponse: {
                __typename: "Mutation",
                moveCard: column,
            },
            update: (proxy, { data: { addCardToRetrospective } }) => {
                const data = proxy.readQuery({
                    query: GET_RETROSPECTIVE,
                    variables: { id },
                });
                const existingCards = data.retrospectiveById.cards;
                const targetCardIndex = R.findIndex(R.propEq("id", cardId))(
                    existingCards
                );
                existingCards[targetCardIndex].column = column;
                proxy.writeQuery({
                    query: GET_RETROSPECTIVE,
                    variables: { id },
                    data,
                });
            },
        });
    };

    handleNewVote = (numVotes, cardId) => {
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
                        count: numVotes + 1,
                        voter: "unknownVoter",
                    }
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
                    const targetVoteIndex = R.findIndex(R.propEq("voter", "unknownVoter"))(
                        card.votes
                    );
                    var vote = card.votes[targetVoteIndex];
                    if (vote === undefined) {
                        vote = {
                            __typename: "Vote",
                            count: 1,
                            voter: "unknownVoter",
                        }
                        card.votes.push(vote)
                    }
                    vote.count = newVote.count

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
                        <Retro
                            className="page-retrospective"
                            subscribeToNewComments={() =>
                              subscribeToMore({
                                document: CARD_SUBSCRIPTION,
                                variables: { rId: id },
                                updateQuery: (prev, { subscriptionData }) => {
                                  if (!subscriptionData.data) return prev;
                                  debugger;

                                  return Object.assign({}, prev, {
                                  });
                                }
                              })
                            }
                        >
                            <DragDropContext onDragEnd={this.handleMoveCard}>
                                {DEFAULT_BOARDS.map(columnName => {
                                    return (
                                        <Column
                                            key={columnName}
                                            isLoading={loading}
                                            title={columnName}
                                            colour={DEFAULT_COLOURS[columnName]}
                                            newVoteHandler={this.handleNewVote}
                                            onNewCard={this.handleAddCard(
                                                columnName
                                            )}
                                            cards={this.getCards(columnName)(
                                                data
                                            )}
                                        />
                                    );
                                })}
                            </DragDropContext>
                        </Retro>
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
)(_Retrospective);
