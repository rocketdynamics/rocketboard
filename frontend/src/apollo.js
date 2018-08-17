import { ApolloClient } from "apollo-client";
import { WebSocketLink } from "apollo-link-ws";
import { InMemoryCache } from "apollo-cache-inmemory";
import { onError } from "apollo-link-error";
import { ApolloLink } from "apollo-link";

const wsUri = new URL(window.location.href);
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
    cache: new InMemoryCache(),
});

export default client;
