import React from "react";
import { Link, Route, Switch, withRouter } from "react-router-dom";
import { graphql } from "react-apollo";

import { START_RETROSPECTIVE } from "../queries";

// Pages
import HomePage from "./Home";
import RetrospectivePage from "./Retrospective";
import WithPetNameToID from "./WithPetNameToID";

// Styling
import { Layout, Menu, Tooltip, Modal } from "antd";
import "./App.css";
import "./Effects.css";
import "antd/dist/antd.css";
import md5 from "md5";
import QRCode from 'qrcode.react';

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
                <span style={{paddingRight: "5px"}}>
                    Online Users:
                </span>
                {this.state.users.map((user) => {
                    return (
                        <div key={user.user} className={`userAvatar userState${user.state}`}>
                            <Tooltip trigger="hover" title={user.user}>
                                <img
                                    alt={user.user}
                                    width="38.4"
                                    height="38.4"
                                    src={`https://gravatar.com/avatar/${md5(user.user)}?d=identicon`}
                                />
                            </Tooltip>
                        </div>
                    )
                })}
            </Menu.Item>
        );
    }
}

class QRModal extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            showQR: false
        };
    }

    showQRCode = (e) => {
        e.preventDefault();
        this.setState({showQR: true})
        console.log("showqr")
        return false;
    }

    hideQRCode = (e) => {
        e.preventDefault();
        this.setState({showQR: false})
        console.log("hideqr")
        return false;
    }

    render() {
        return (
            <div style={{display: "flex", flex: "1"}}>
                <a onClick={this.showQRCode} href="#">
                    <img style={{width: "40px", opacity: "0.8"}}
                        alt="Show QR Code"
                        title="Show QR Code"
                        src="/qr-code.svg"/>
                </a>
                <Modal
                  title="QR Code"
                  visible={this.state.showQR}
                  onCancel={this.hideQRCode}
                  footer={null}
                >
                    <QRCode renderAs="svg" size="100%" value={window.location.href} />
                </Modal>
            </div>
        )
    }
}

class App extends React.Component {
    constructor(props) {
        super(props);

        this.onlineUsersCallbackHolder = {
            setOnlineUsers: null
        };
    }

    onLaunch = async () => {
        const results = await this.props.startRetrospective();
        this.props.history.push(`/${results.data.startRetrospective}/`);
    };

    render() {
        return (
            <Layout className="layout">
                <Header className="header">
                    <h1 className="logo">
                        <Link to="/">Rocketboard</Link>
                    </h1>
                    <Menu mode="horizontal" className="menu">
                        <QRModal/>
                        <OnlineUsers holder={this.onlineUsersCallbackHolder}/>
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
                        <Route path="/:petName/" component={(props) => {
                            const Component = WithPetNameToID(props.match.params.petName)(RetrospectivePage);
                            return <Component {...props} setOnlineUsersHolder={this.onlineUsersCallbackHolder} />
                        }}/>
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
