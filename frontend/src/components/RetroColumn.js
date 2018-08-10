import React, { Component } from 'react'
import PropTypes from 'prop-types';
import { List, Card } from 'antd';
import { Droppable, Draggable } from 'react-beautiful-dnd';

class RetroColumn extends Component {
  render() {
    const { cards, title, colour, grid, cardWidth } = this.props;

    return (
      <Droppable droppableId={title}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            style={{ flex: 1 }}
          >
            <List
              header={<h2>{title}</h2>}
              grid={grid}
              dataSource={cards}
              renderItem={item => (
                <Draggable key={`${title}-${item.Id}`} draggableId={`${title}-${item.Id}`} index={item.Id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                    >
                      <List.Item>
                        <Card
                            style={{ width: (cardWidth || "100%"), backgroundColor: colour }}>
                          <p>
                            {item.Message}
                            {item.Id}
                          </p>
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
    )
  }
}

RetroColumn.propTypes = {
  title: PropTypes.string.isRequired,
  colour: PropTypes.string.isRequired,
  layout: PropTypes.string,
  cardWidth: PropTypes.integer,
}

export default RetroColumn
