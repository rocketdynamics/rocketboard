import React, { Component } from "react";
import PropTypes from "prop-types";
import { List, Card, Icon } from "antd";
import { Droppable, Draggable } from "react-beautiful-dnd";

const IconText = ({ type, text }) => (
    <span>
        <Icon type={type} style={{ marginRight: 8 }} />
        {text}
    </span>
);

class RetroColumn extends Component {
    render() {
        const { cards, title, colour, grid, cardWidth } = this.props;

        return (
            <Droppable droppableId={title}>
                {(provided, snapshot) => (
                    <div ref={provided.innerRef} style={{ flex: 1 }}>
                        <List
                            header={<h2>{title}</h2>}
                            grid={grid}
                            dataSource={cards}
                            renderItem={item => (
                                <Draggable
                                    key={`${title}-${item.id}`}
                                    draggableId={`${title}-${item.id}`}
                                    index={item.id}
                                >
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                        >
                                            <List.Item>
                                                <Card
                                                    actions={[
                                                        <IconText
                                                            type="like-o"
                                                            text="156"
                                                        />,
                                                        <IconText
                                                            type="message"
                                                            text="2"
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
        );
    }
}

RetroColumn.propTypes = {
    title: PropTypes.string.isRequired,
    colour: PropTypes.string.isRequired,
    layout: PropTypes.string,
    cardWidth: PropTypes.integer,
};

export default RetroColumn;
