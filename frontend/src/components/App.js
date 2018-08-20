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
import "./Effects.css";
import "antd/dist/antd.css";
import md5 from "md5";

const { Header, Content, Footer } = Layout;


class OnlineUsers extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            users: []
        };
    }

    componentWillMount() {
        this.props.holder.setOnlineUsers = this.setOnlineUsers;
    }

    setOnlineUsers = (users) => {
        this.setState({
            users: users
        });
    }

    render() {
        if (!this.state.users || this.state.users.length === 0) return null;
        return (
            <Menu.Item
                key="users"
                onItemHover={() => {}}
            >
                Online Users:
                {this.state.users.map((user) => {
                    return <img key={user} className="userAvatar" title={user} src={`https://gravatar.com/avatar/${md5(user)}?d=identicon`}/>
                })}
            </Menu.Item>
        );
    }
}

class App extends React.Component {
    onLaunch = async () => {
        const results = await this.props.startRetrospective();
        this.props.history.push(`/${results.data.startRetrospective}/`);
    };

    render() {
        var onlineUsersCallbackHolder = {
            setOnlineUsers: () => {}
        };

        return (
            <Layout className="layout">
                <Header className="header">
                    <h1 className="logo">
                        <Link to="/">Rocketboard</Link>
                    </h1>

                    <Menu mode="horizontal" className="menu">
                        <OnlineUsers holder={onlineUsersCallbackHolder}/>
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
                        <Route path="/:id/" component={(props) => (<RetrospectivePage {...props} setOnlineUsersHolder={onlineUsersCallbackHolder}/>)}/>
                        <Route path="/" component={HomePage} />
                    </Switch>
                </Content>

                <Footer className="footer">
                    Powered by{" "}
                    <span role="img" aria-label="beer">
                        🍺
                    </span>
                    ,{" "}
                    <span role="img" aria-label="coffee">
                        ☕
                    </span>{" "}
                    and NIH Principles
                </Footer>
            </Layout>
        );
    }
}

export default graphql(START_RETROSPECTIVE, { name: "startRetrospective" })(
    withRouter(App)
);
