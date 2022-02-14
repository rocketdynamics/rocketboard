import React from "react";
import { render } from "react-dom";
import { BrowserRouter as Router } from "react-router-dom";
import { ApolloProvider } from "@apollo/client";

// Config
import client from "./apollo";

import App from "./components/App";

// Styling
import "./index.css";

render(
    <ApolloProvider client={client}>
        <Router basename="/">
            <App />
        </Router>
    </ApolloProvider>,
    document.getElementById("root")
);
