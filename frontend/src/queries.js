import gql from "graphql-tag";

export const START_RETROSPECTIVE = gql`
    mutation StartRetrospective {
        startRetrospective(name: "")
    }
`;

export const GET_RETROSPECTIVE_ID = gql`
    query GetRetrospectiveByPetName($petName: String!) {
        retrospectiveByPetName(petName: $petName) {
            id
        }
    }
`

export const GET_RETROSPECTIVE = gql`
    query GetRetrospective($id: ID!) {
        retrospectiveById(id: $id) {
            id
            name
            created
            updated
            onlineUsers {
                user
                state
            }
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
                    emoji
                }
                position
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
    mutation($cardId: ID!, $emoji: String!) {
        newVote(cardId: $cardId, emoji: $emoji) {
            count
            voter
            emoji
        }
    }
`;

export const SEND_HEARTBEAT = gql`
    mutation($rId: ID!, $state: String!) {
        sendHeartbeat(rId: $rId, state: $state)
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
                emoji
            }
            position
        }
    }
`;

export const RETRO_SUBSCRIPTION = gql`
    subscription OnRetroChanged($rId: String!) {
        retroChanged(rId: $rId) {
            id
            name
            onlineUsers {
                user
                state
            }
        }
    }
`;
