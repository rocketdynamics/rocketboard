import { ApolloLink, InMemoryCache, ApolloClient } from '@apollo/client';
import { WebSocketLink } from "@apollo/client/link/ws";
import { onError } from "@apollo/client/link/error";

var wsUri = new URL("https://rocketboard-ntxbgh6iiq-nw.a.run.app");
if (window.location.hostname == "localhost") {
    wsUri = new URL(window.location.href);
}
wsUri.protocol = wsUri.protocol.startsWith("https") ? "wss" : "ws";
wsUri.pathname = "/query";
wsUri.hash = "";

const client = new ApolloClient({
    link: ApolloLink.from([
        onError(({ graphQLErrors, networkError }) => {
            if (graphQLErrors)
                graphQLErrors.map(({ message, locations, path }) =>
                    console.log(
                        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
                    )
                );
            if (networkError) console.log(`[Network error]: ${networkError}`);
        }),
        new WebSocketLink({
            uri: wsUri,
            options: {
                reconnect: true,
            },
        }),
    ]),
    cache: new InMemoryCache({
        typePolicies: {
            Retrospective: {
                fields: {
                    cards: {
                        merge: false,
                    },
                    onlineUsers: {
                        merge: false,
                    }
                },
            },
            Card: {
                fields: {
                    mergedCards: {
                        merge: false,
                    }
                }
            },
        }
    }),
});

export default client;
