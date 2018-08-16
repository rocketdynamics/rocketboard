import React from "react";
import * as R from "ramda";

import { Icon, Input, Tooltip } from "antd";
import Timer from "./Timer";

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

    createVoteEffect = (numVotes) => {
        // Prevent lag on effect spam
        if (this.state.effects.length > 50) {
            return;
        }

        var effect = {
            expired: false,
            key: this.id,
            randomId: Math.floor(Math.random() * 99),
            numVotes: numVotes,
        };
        this.id += 1;

        this.setState({
            effects: [...this.state.effects, effect],
        });

        setTimeout(() => {
            effect.expired = true;
        }, 800);

        if (this.cleanupTimeout === null) {
            this.cleanupTimeout = setTimeout(() => {
                this.setState({
                    effects: R.filter(
                        R.propEq("expired", false),
                        this.state.effects
                    ),
                });
                this.cleanupTimeout = null;
            }, 1000);
        }
    };

    componentWillReceiveProps(nextProps) {
        const numVotes = R.sum(R.pluck("count")(this.props.data.votes));
        const nextVotes = R.sum(R.pluck("count")(nextProps.data.votes));

        if (nextVotes > numVotes) {
            this.createVoteEffect(nextVotes);
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

    getDiscussionDuration = () => {
        if (this.isInProgress()) {
            return (
                new Date().getTime() -
                new Date(this.getCurrentStatus().created).getTime()
            );
        } else if (this.isDiscussed()) {
            const start = R.find(R.propEq("type", "InProgress"))(
                this.props.data.statuses
            );
            return (
                new Date(this.getCurrentStatus().created).getTime() -
                new Date(start.created).getTime()
            );
        }
        return 0;
    };

    render() {
        const { id, votes } = this.props.data;
        const { isDragging, onNewVote, onSetStatus } = this.props;
        const numVotes = R.sum(R.pluck("count")(votes));

        let body = <p>{this.props.data.message}</p>;
        if (this.state.isEditing) {
            body = (
                <Input.TextArea
                    onChange={this.handleMessageChange}
                    onBlur={this.toggleEditing}
                    className="card-input"
                    rows={4}
                    value={this.state.message}
                />
            );
        }

        const vote = (
            <div className="card-action-clap" onClick={onNewVote(id)}>
                <div>
                    <span role="img" aria-label="clap">
                        👏
                    </span>{" "}
                    <span className="card-action-count">{numVotes}</span>
                </div>

                {this.state.effects.map(effect => {
                    if (effect.expired) return null;
                    return (
                        <div id={effect.key} key={effect.key}>
                            <div
                                className="vote-effect"
                                style={{
                                    animation: `card-voting-${
                                        effect.randomId
                                    } 800ms ease forwards`,
                                }}
                            >
                                <span role="img" aria-label="clap">
                                    👏
                                </span>{" "}
                                <span className="card-action-count">
                                    {effect.numVotes}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        );

        let statusAction = null;
        if (this.hasNoStatus()) {
            statusAction = (
                <div
                    className="card-action-item"
                    onClick={onSetStatus("InProgress", id)}
                >
                    <Tooltip title="Start Discussion">
                        <span role="img" aria-label="discuss">
                            📣
                        </span>
                    </Tooltip>
                </div>
            );
        } else if (this.isInProgress()) {
            statusAction = (
                <div
                    className="card-action-item"
                    onClick={onSetStatus("Discussed", id)}
                >
                    <Tooltip title="End Discussion">
                        <span role="img" aria-label="end discussion">
                            🤐
                        </span>
                    </Tooltip>
                </div>
            );
        }

        return (
            <div
                id={`card-${id}`}
                className={`card ${isDragging && "card-dragging"}`}
                style={{
                    borderTop: `6px solid ${this.props.colour}`,
                }}
            >
                <div onDoubleClick={this.toggleEditing} className="card-body">
                    {body}
                </div>

                <div className="card-actions">{statusAction}</div>

                {!this.hasNoStatus() && (
                    <div
                        className={`card-timer ${this.isDiscussed() &&
                            "card-timer-discussed"}`}
                    >
                        <Timer getDuration={this.getDiscussionDuration} />
                    </div>
                )}

                {vote}
            </div>
        );
    }
}

export default RetroCard;
