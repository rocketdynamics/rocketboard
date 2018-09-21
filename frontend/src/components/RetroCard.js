import React from "react";
import * as R from "ramda";

import { Icon, Input, Tooltip } from "antd";
import Timer from "./Timer";

const EMOJI_MAP = {
    "clap": "👏",
    "unicorn": "🦄",
    "rocket": "🚀",
    "ramen": "🍜",
    "vomit": "🤮",
    "+1": "👍",
    "tada": "🎉",
    "sauropod": "🦕",
    "poop": "💩",
    "bomb": "💣",
    "mushroom": "🍄",
}

class RetroCard extends React.PureComponent {
    constructor(props) {
        super(props);
        this.state = {
            isEditing: false,
            message: "",
            effects: [],
            reactionShow: false,
        };
        this.id = 0;
        this.cleanupTimeout = null;
        this.inputRef = React.createRef();
    }

    componentDidMount() {
        if (this.props.isNew) {
            this.setEditingOn();
        }
    }

    onKeyDown = (e, data) => {
        if (e.key === "Enter") {
            this.inputRef.current.textAreaRef.blur();
        }
        return true;
    };

    setEditingOn = e => {
        this.setState({
            message: this.props.data.message,
        });
        setTimeout(() => {
            this.inputRef.current.textAreaRef.focus();
            this.inputRef.current.textAreaRef.select();
        }, 1);
        this.setState({ isEditing: true });
    };

    setEditingOff = e => {
        this.props.onMessageUpdated({
            cardId: this.props.data.id,
            message: this.state.message,
        });
        this.setState({ isEditing: false });
    };

    handleMessageChange = e => {
        this.setState({ message: e.target.value });
    };

    createVoteEffect = (numVotes, emoji) => {
        // Prevent lag on effect spam
        if (this.state.effects.length > 100) {
            return;
        }

        var effect = {
            expired: false,
            key: this.id,
            randomId: Math.floor(Math.random() * 100),
            numVotes: numVotes,
            emoji: emoji,
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
        const sumVotes = R.compose(R.sum, R.pluck("count"));

        const numVotes = sumVotes(this.props.data.votes);
        const nextVotes = sumVotes(nextProps.data.votes);

        if (nextVotes > numVotes) {
            const votesByEmoji = R.groupBy(R.prop("emoji"), this.props.data.votes);
            const nextVotesByEmoji = R.groupBy(R.prop("emoji"), nextProps.data.votes);

            R.mapObjIndexed((i, emoji, votes) => {
                if (sumVotes(votes[emoji] || []) > sumVotes(votesByEmoji[emoji] || [])) {
                    this.createVoteEffect(sumVotes(votes[emoji]), emoji);
                }
            }, nextVotesByEmoji)
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

    handleReactionVisibleChange = (visible) => {
        this.setState({
            reactionShow: visible,
        })
    }

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
        const isOptimistic = this.props.data.creator === "";
        const sumVotes = R.compose(R.sum, R.pluck("count"));
        const votesByEmoji = R.groupBy(R.prop("emoji"), votes);

        const hiddenStyle = { display: "none" };
        const visibleStyle = { display: "block" };
        let body = (
            <div>
                <p style={this.state.isEditing ? hiddenStyle : visibleStyle}>
                    {this.props.data.message}
                </p>
                <Input.TextArea
                    style={this.state.isEditing ? visibleStyle : hiddenStyle}
                    onChange={this.handleMessageChange}
                    onBlur={this.setEditingOff}
                    onKeyDown={this.onKeyDown}
                    placeholder="Retrospective item..."
                    className="card-input"
                    rows={4}
                    ref={this.inputRef}
                    value={this.state.message}
                />
            </div>
        );
        const voteTypes = R.uniq(R.filter((o) => {return o !== undefined}, R.pluck("emoji", votes)));

        const vote = (
            <div className="card-reactions">
            {voteTypes.map(emoji => (
                <div key={emoji} className={`card-reaction reaction-${emoji}`} onClick={onNewVote(id, emoji)}>
                    <div className="emoji">
                        <span role="img" aria-label={emoji}>
                            {EMOJI_MAP[emoji]}
                        </span>{" "}
                        <span className="card-reaction-count">{sumVotes(votesByEmoji[emoji]) || 0}</span>
                    </div>

                    {R.filter((e) => {return e.emoji === emoji}, this.state.effects).map(effect => {
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
                                    <span role="img" aria-label={emoji}>
                                        {EMOJI_MAP[emoji]}
                                    </span>{" "}
                                    <span className="card-reaction-count">
                                        {effect.numVotes}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ))}
            {!isOptimistic && Object.keys(votesByEmoji).length < 5 && (
                <div key="new" className={`card-reaction reaction-new`}>
                    <Tooltip trigger="click" visible={this.state.reactionShow} onVisibleChange={this.handleReactionVisibleChange} title={(
                        <span style={{cursor: "pointer"}}>
                            {R.toPairs(EMOJI_MAP).map(elem => {
                                const emoji = elem[0];
                                const icon = elem[1];
                                return (
                                    <span key={emoji} onClick={() => {this.setState({reactionShow: false}); onNewVote(id, emoji)()}} role="img" aria-label={emoji}>
                                        {icon}
                                    </span>
                            )})}
                        </span>
                    )}>
                        <div className="emoji">
                            <span role="img" className="reaction-new-button" aria-label="new-reaction">
                                😀
                            </span>
                        </div>
                    </Tooltip>
                </div>
            )}
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
                className={`card ${isDragging ? "card-dragging" : ""}`}
                style={{
                    borderTop: `6px solid ${this.props.colour}`,
                }}
            >
                <div onDoubleClick={this.setEditingOn} className="card-body">
                    {body}

                    <small style={{transition: "all 1s ease", opacity: !isOptimistic ? 1 : 0}}>{this.props.data.creator}</small>
                </div>

                {!this.props.isNew && (
                    <div className="card-actions">{statusAction}</div>
                )}

                {!this.hasNoStatus() && (
                    <div
                        className={`card-timer ${this.isDiscussed() &&
                            "card-timer-discussed"}`}
                    >
                        <Timer getDuration={this.getDiscussionDuration} />
                    </div>
                )}

                {!this.props.isNew && (
                    vote
                )}
            </div>
        );
    }
}

export default RetroCard;
