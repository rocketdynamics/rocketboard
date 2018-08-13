import React from "react";
import { render } from "react-dom";
import { BrowserRouter as Router } from "react-router-dom";
import { ApolloProvider } from "react-apollo";

// Config
import client from "./apollo";

import App from "./components/App";

// Styling
import "./index.css";

render(
    <ApolloProvider client={client}>
        <Router basename="/retrospective/">
            <App />
        </Router>
    </ApolloProvider>,
    document.getElementById("root")
);
