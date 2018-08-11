import ApolloClient from "apollo-boost";

const client = new ApolloClient({
    uri: "/query",
});

export default client;
