import React from "react";
import { Link, Route, Switch, withRouter } from "react-router-dom";
import { graphql } from "react-apollo";

import { START_RETROSPECTIVE } from "../queries";

// Pages
import HomePage from "./Home";
import RetrospectivePage from "./Retrospective";

// Styling
import { Layout, Menu } from "antd";
import "./App.css";
import "antd/dist/antd.css";

const { Header, Content } = Layout;

class App extends React.Component {
    onLaunch = async () => {
        const results = await this.props.startRetrospective();
        this.props.history.push(`/${results.data.startRetrospective}/`);
    };

    render() {
        return (
            <Layout className="layout">
                <Header className="header">
                    <Link to="/">
                        <h1 className="logo">Rocketboard</h1>
                    </Link>

                    <Menu mode="horizontal" className="menu">
                        <Menu.Item
                            key="launch"
                            className="action-launch"
                            onClick={this.onLaunch}
                        >
                            Launch into Orbit{" "}
                            <span role="img" aria-label="rocket">
                                🚀
                            </span>
                        </Menu.Item>
                    </Menu>
                </Header>

                <Content className="content">
                    <Switch>
                        <Route path="/:id/" component={RetrospectivePage} />
                        <Route path="/" component={HomePage} />
                    </Switch>
                </Content>
            </Layout>
        );
    }
}

export default graphql(START_RETROSPECTIVE, { name: "startRetrospective" })(
    withRouter(App)
);
