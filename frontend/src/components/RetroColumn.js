import React, { Component } from "react";
import PropTypes from "prop-types";
import { List, Card, Icon } from "antd";
import { Droppable, Draggable } from "react-beautiful-dnd";
import * as R from "ramda";

const IconText = ({ type, text }) => (
    <span>
        <Icon type={type} style={{ marginRight: 8 }} />
        {text}
    </span>
);

class RetroColumn extends Component {
    handleAdd = e => {
        e.preventDefault();
        if (this.props.onNewCard) {
            this.props.onNewCard("New Card");
        }

        this.setState({ isEditing: false });
    };

    render() {
        const { cards, title, colour, grid, cardWidth } = this.props;

        return (
            <div style={{ flex: 1 }}>
                <h2 style={{textAlign: "center"}}>{title}</h2>
                <a style={{display: "block", textAlign: "center"}} onClick={this.handleAdd}>
                    <IconText
                        type="plus-circle-o"
                        text="Add Card"
                    />
                </a>
                <Droppable droppableId={title}>
                    {(provided, snapshot) => (
                        <div style={{minHeight:"500px"}} ref={provided.innerRef} {...provided.droppableProps}>
                            <List
                                footer={provided.placeholder}
                                grid={grid}
                                locale={{
                                    emptyText: ""
                                }}
                                dataSource={cards}
                                renderItem={item => (
                                    <Draggable
                                        key={`${title}-${item.id}`}
                                        draggableId={`${item.id}`}
                                        index={item.id}
                                    >
                                        {(provided, snapshot) => (
                                            <div
                                                class="card"
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                            >
                                                <List.Item>
                                                    <Card
                                                        id={`card-${item.id}`}
                                                        data-message={item.message}
                                                        actions={[
                                                            <IconText
                                                                type="like-o"
                                                                text={R.sum(R.pluck('count')(item.votes))}
                                                            />,
                                                            <IconText
                                                                type="message"
                                                                text="0"
                                                            />,
                                                        ]}
                                                        style={{
                                                            width:
                                                                cardWidth || "100%",
                                                            backgroundColor: colour,
                                                        }}
                                                    >
                                                        <p>{item.message}</p>
                                                    </Card>
                                                </List.Item>
                                            </div>
                                        )}
                                    </Draggable>
                                )}
                            />
                        </div>
                    )}
                </Droppable>
            </div>
        );
    }
}

RetroColumn.propTypes = {
    title: PropTypes.string.isRequired,
    colour: PropTypes.string.isRequired,
    layout: PropTypes.string,
    cardWidth: PropTypes.number,
};

export default RetroColumn;
