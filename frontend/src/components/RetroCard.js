import React from "react";
import * as R from "ramda";

import { Card, Icon, Input } from "antd";

const IconText = ({ type, text = "", ...otherProps }) => (
    <span {...otherProps}>
        <Icon type={type} style={{ marginRight: 8 }} />
        {text}
    </span>
);

class RetroCard extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            isEditing: false,
            message: this.props.data.message,
            effects: [],
        };
    }

    toggleEditing = e => {
        e.preventDefault();

        if (this.state.isEditing && this.props.onMessageUpdated) {
            this.props.onMessageUpdated({
                cardId: this.props.data.id,
                message: this.state.message,
            });
        }

        this.setState({ isEditing: !this.state.isEditing });
    };

    handleMessageChange = e => {
        this.setState({ message: e.target.value });
    };

    createVoteEffect = () => {
        this.setState({
            effects: [...this.state.effects, 0]
        })

        clearTimeout(this.cleanupTimeout);

        this.cleanupTimeout = setTimeout(() => {
            this.setState({effects: []})
        }, 500);
    }

    componentWillReceiveProps(nextProps) {
        const numVotes = R.sum(R.pluck("count")(this.props.data.votes));
        const nextVotes = R.sum(R.pluck("count")(nextProps.data.votes));

        if (nextVotes > numVotes) {
            this.createVoteEffect();
        }
    }

    render() {
        const { id, votes } = this.props.data;
        const { newVoteHandler } = this.props;
        const numVotes = R.sum(R.pluck("count")(votes));

        let body = <p>{this.state.message}</p>;
        if (this.state.isEditing) {
            body = (
                <Input.TextArea
                    onChange={this.handleMessageChange}
                    onBlur={this.toggleEditing}
                    rows={4}
                    value={this.state.message}
                />
            );
        }

        this.voteIcon = (
            <span>
                <IconText
                    type="like-o"
                    style={{position: "relative"}}
                    text={numVotes}
                    onClick={newVoteHandler(numVotes, id)}
                />
                {this.state.effects.map((effect, i) => (
                        <IconText
                            type="like-o"
                            className="vote-effect"
                            style={{
                                position: "absolute",
                                top: "0px",
                                left: "0px",
                                pointerEvents: "none",
                            }}
                            key={i}
                            text={numVotes}
                        />
                )
                )}
            </span>
        );

        return (
            <Card
                id={`card-${id}`}
                actions={[
                    this.voteIcon,
                    <IconText type="message" text="0" />,
                    <IconText
                        type={this.state.isEditing ? "save" : "edit"}
                        onClick={this.toggleEditing}
                    />,
                ]}
                style={{
                    width: this.props.cardWidth || "100%",
                    backgroundColor: this.props.colour,
                }}
            >
                {body}
            </Card>
        );
    }
}

export default RetroCard;
