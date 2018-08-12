import React from "react";
import { BrowserRouter as Router, Route, Link, Switch } from "react-router-dom";
import { ApolloProvider } from "react-apollo";

// Config
import client from "../apollo";

// Pages
import HomePage from "./Home";
import RetrospectivePage from "./Retrospective";

// Styling
import "./App.css";
import "antd/dist/antd.css";

class App extends React.Component {
    render() {
        return (
            <Router basename="/retrospective/">
                <div className="wrapper">
                    <div className="header">
                        <Link to="/">
                            <h1 className="header-title">Rocketboard</h1>
                        </Link>
                        <h2 className="header-subtitle">
                            Experience Rocket Growth™ in your Retrospectives
                            <br />
                            (by Rocket Growth™ Hackers for Rocket Growth™
                            Hackers 👩‍🚀)
                        </h2>
                    </div>

                    <ApolloProvider client={client}>
                        <Switch>
                            <Route path="/:id/" component={RetrospectivePage} />
                            <Route path="/" component={HomePage} />
                        </Switch>
                    </ApolloProvider>
                </div>
            </Router>
        );
    }
}

export default App;
