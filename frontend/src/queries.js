import gql from "graphql-tag";

export const START_RETROSPECTIVE = gql`
    mutation StartRetrospective {
        startRetrospective(name: "")
    }
`;

export const GET_RETROSPECTIVE = gql`
    query GetRetrospective($id: ID!) {
        retrospectiveById(id: $id) {
            id
            name
            created
            updated
            cards {
                id
                message
                column
                votes {
                    voter
                    count
                }
            }
        }
    }
`;

export const ADD_CARD = gql`
    mutation AddCard($id: ID!, $column: String!, $message: String!) {
        addCardToRetrospective(id: $id, column: $column, message: $message)
    }
`;

export const MOVE_CARD = gql`
    mutation MoveCard($id: ID!, $column: String!) {
        moveCard(id: $id, column: $column)
    }
`;
