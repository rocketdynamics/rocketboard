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
                creator
                statuses {
                    id
                    created
                    type
                }
                votes {
                    voter
                    count
                }
                index
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
    mutation MoveCard($id: ID!, $column: String!, $index: Int!) {
        moveCard(id: $id, column: $column, index: $index)
    }
`;

export const UPDATE_MESSAGE = gql`
    mutation UpdateMessage($id: ID!, $message: String!) {
        updateMessage(id: $id, message: $message)
    }
`;

export const UPDATE_STATUS = gql`
    mutation UpdateStatus($id: ID!, $status: StatusType!) {
        updateStatus(id: $id, status: $status) {
            id
            created
            type
        }
    }
`;

export const NEW_VOTE = gql`
    mutation($cardId: ID!) {
        newVote(cardId: $cardId) {
            count
            voter
        }
    }
`;

export const CARD_SUBSCRIPTION = gql`
    subscription OnCardChanged($rId: String!) {
        cardChanged(rId: $rId) {
            id
            message
            column
            creator
            statuses {
                id
                created
                type
            }
            votes {
                count
                voter
            }
            index
        }
    }
`;
