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

        return (
            <Card
                id={`card-${id}`}
                actions={[
                    <IconText
                        type="like-o"
                        text={numVotes}
                        onClick={newVoteHandler(numVotes, id)}
                    />,
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
