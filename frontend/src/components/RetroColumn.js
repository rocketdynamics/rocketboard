import React, { Component } from 'react'
import PropTypes from 'prop-types';
import { List, Card } from 'antd';

class RetroColumn extends Component {
  render() {
    const data = [
      {
        message: "Retro message",
      }
    ]

    const { title, colour, layout, cardWidth } = this.props;

    return (
      <List
        style={{ flex: 1 }}
        header={<h2>{title}</h2>}
        itemLayout={layout || "horizontal"}
        dataSource={data}
        renderItem={item => (
          <List.Item>
            <Card style={{ width: (cardWidth || "100%"), backgroundColor: colour }}>
              <p>
                {item.message}
              </p>
            </Card>
          </List.Item>
        )}
      />
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
