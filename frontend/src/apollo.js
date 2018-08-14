import { ApolloClient } from "apollo-client";
import { WebSocketLink } from "apollo-link-ws";
import { InMemoryCache } from "apollo-cache-inmemory";
import { HttpLink } from "apollo-link-http";
import { onError } from "apollo-link-error";
import { ApolloLink } from "apollo-link";

const wsUri = new URL(window.location.href);
wsUri.protocol = "ws";
wsUri.pathname = "/query";

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
        new HttpLink({
            uri: "/query",
            credentials: "same-origin",
        }),
    ]),
    cache: new InMemoryCache(),
});

export default client;
