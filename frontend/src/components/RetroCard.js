import React from "react";
import * as R from "ramda";

import { Card, Icon, Input, Tag } from "antd";
import TimeAgo from "react-timeago";

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
            message: "",
            effects: [],
        };
        this.id = 0;
        this.cleanupTimeout = null;
    }

    toggleEditing = e => {
        e.preventDefault();

        if (this.state.isEditing && this.props.onMessageUpdated) {
            this.props.onMessageUpdated({
                cardId: this.props.data.id,
                message: this.state.message,
            });
        } else if (!this.state.isEditing) {
            this.setState({
                message: this.props.data.message,
            });
        }

        this.setState({ isEditing: !this.state.isEditing });
    };

    handleMessageChange = e => {
        this.setState({ message: e.target.value });
    };

    createVoteEffect = () => {
        // Prevent lag on effect spam
        if (this.state.effects.length > 50) {
            return;
        }

        var effect = {
            expired: false,
            key: this.id,
        }
        this.id += 1;

        this.setState({
            effects: [...this.state.effects, effect],
        });

        setTimeout(() => {
            effect.expired = true;
        }, 400);

        if (this.cleanupTimeout === null ) {
            this.cleanupTimeout = setTimeout(() => {
                this.setState({ effects: R.filter(R.propEq("expired", false), this.state.effects) });
                this.cleanupTimeout = null;
            }, 500);
        }
    };

    componentWillReceiveProps(nextProps) {
        const numVotes = R.sum(R.pluck("count")(this.props.data.votes));
        const nextVotes = R.sum(R.pluck("count")(nextProps.data.votes));

        if (nextVotes > numVotes) {
            this.createVoteEffect();
        }
    }

    getCurrentStatus = () => {
        return R.last(this.props.data.statuses);
    };

    getStatusType = status => {
        return R.propOr("", "type")(status);
    };

    hasNoStatus = () => {
        return R.isNil(this.getCurrentStatus());
    };

    isInProgress = () => {
        return this.getStatusType(this.getCurrentStatus()) === "InProgress";
    };

    isDiscussed = () => {
        return this.getStatusType(this.getCurrentStatus()) === "Discussed";
    };

    render() {
        const { id, votes } = this.props.data;
        const { onNewVote, onSetStatus } = this.props;
        const numVotes = R.sum(R.pluck("count")(votes));

        let body = <p>{this.props.data.message}</p>;
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
                    style={{ position: "relative" }}
                    text={numVotes}
                    onClick={onNewVote(numVotes, id)}
                />
                {this.state.effects.map((effect) => {
                    if (effect.expired) return null;
                    return <IconText
                        type="like-o"
                        className="vote-effect"
                        style={{
                            position: "absolute",
                            top: "0px",
                            left: "0px",
                            pointerEvents: "none",
                        }}
                        key={effect.key}
                        text={numVotes}
                    />
                })}
            </span>
        );

        let actions = [
            this.voteIcon,
            <IconText type="message" text="0" />,
            <IconText
                type={this.state.isEditing ? "save" : "edit"}
                onClick={this.toggleEditing}
            />,
        ];

        if (this.hasNoStatus()) {
            actions = [
                ...actions,
                <IconText
                    type="play-circle-o"
                    onClick={onSetStatus("InProgress", id)}
                />,
            ];
        } else if (this.isInProgress()) {
            actions = [
                ...actions,
                <IconText
                    type="check-circle"
                    onClick={onSetStatus("Discussed", id)}
                />,
            ];
        }

        return (
            <Card
                id={`card-${id}`}
                actions={actions}
                style={{
                    width: this.props.cardWidth || "100%",
                    backgroundColor: this.props.colour,
                }}
            >
                {body}

                <div>
                    {this.isInProgress() && (
                        <Tag>
                            In Discussion:{" "}
                            <TimeAgo date={this.getCurrentStatus().created} />
                        </Tag>
                    )}
                </div>
            </Card>
        );
    }
}

export default RetroCard;
