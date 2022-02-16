import React, { useEffect, useState } from "react";
import {
  Routes,
  Route,
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";
import { useQuery, useSubscription } from '@apollo/client';
import { graphql } from '@apollo/client/react/hoc';

import {
    START_RETROSPECTIVE,
    GET_RETROSPECTIVE_ID,
    RETRO_SUBSCRIPTION,
 } from "../queries";

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

function LiveOnlineUsers({ id }) {
    var { loading, data } = useSubscription(RETRO_SUBSCRIPTION, {
        variables: { rId: id },
    });

    if (loading) {
        return null;
    }

    const users = data.retroChanged.onlineUsers;

    return (
        <Menu.Item
            key="users"
        >
            <span style={{paddingRight: "5px"}}>
                Online Users:
            </span>
            {users.map((user) => {
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

function OnlineUsers(props) {
    const { petName } = useParams();

    var { loading, data } = useQuery(GET_RETROSPECTIVE_ID, {
        variables: { petName },
    });

    if (loading) {
        return null;
    }

    return <LiveOnlineUsers id={data.retrospectiveByPetName.id} />
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

function App(props) {
    const navigate = useNavigate();

    const onLaunch = async () => {
        const results = await props.startRetrospective();
        navigate(`/retrospective/${results.data.startRetrospective}/`);
    };

    return (
        <Layout className="layout">
            <Header className="header">
                <h1 className="logo">
                    <Link to="/">Rocketboard</Link>
                </h1>
                <Menu disabledOverflow="true" mode="horizontal" className="menu">
                    <QRModal/>
                    <Routes>
                        <Route path="/" element={null} />
                        <Route path="/retrospective/:petName/" element={
                            <OnlineUsers/>
                        }/>
                    </Routes>
                    <Menu.Item
                        key="launch"
                        className="action-launch"
                        onClick={onLaunch}
                    >
                        Launch into Orbit{" "}
                        <span role="img" aria-label="rocket">
                            🚀
                        </span>
                    </Menu.Item>
                </Menu>
            </Header>

            <Content className="content">
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/retrospective/:petName/" element={
                        <WithPetNameToID component={RetrospectivePage} />
                    }/>
                </Routes>
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

export default graphql(START_RETROSPECTIVE, { name: "startRetrospective" })(
    App
);
