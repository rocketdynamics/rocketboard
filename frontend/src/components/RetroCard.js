import React from "react";
import * as R from "ramda";

import { Input } from "antd";

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
            randomId: Math.floor(Math.random() * 99),
        };
        this.id += 1;

        this.setState({
            effects: [...this.state.effects, effect],
        });

        setTimeout(() => {
            effect.expired = true;
        }, 400);

        if (this.cleanupTimeout === null) {
            this.cleanupTimeout = setTimeout(() => {
                this.setState({
                    effects: R.filter(
                        R.propEq("expired", false),
                        this.state.effects
                    ),
                });
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
                                    } 400ms ease forwards`,
                                }}
                            >
                                <span role="img" aria-label="clap">
                                    👏
                                </span>{" "}
                                <span className="card-action-count">
                                    {numVotes}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        );

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

                {vote}
            </div>
        );
    }
}

export default RetroCard;
