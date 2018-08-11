import React from "react";
import gql from "graphql-tag";
import { Query, Mutation } from "react-apollo";
import * as R from "ramda";

import Column from "./Column";

import "wired-elements";

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

const DEFAULT_BOARDS = ["Positive", "Mixed", "Negative"];

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
                                    {DEFAULT_BOARDS.map(name => (
                                        <Column
                                            isLoading={loading}
                                            key={name}
                                            name={name}
                                            onNewCard={handleNewCard(name)}
                                            cards={getCards(name)(data)}
                                        />
                                    ))}
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
