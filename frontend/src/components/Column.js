import React from "react";

import "wired-elements";

class Column extends React.Component {
    input = null;

    state = {
        isEditing: false,
    };

    toggleEditing = e => {
        e.preventDefault();
        this.setState({ isEditing: !this.state.isEditing });
    };

    handleAdd = e => {
        e.preventDefault();
        if (!this.input) {
            return;
        }

        if (this.props.onNewCard) {
            this.props.onNewCard(this.input.value);
        }

        this.setState({ isEditing: false });
    };

    render() {
        const { name, cards, isLoading } = this.props;

        return (
            <div className="column">
                <h3 className="column-header">
                    {name}

                    <div className="column-action">
                        {!isLoading &&
                            !this.state.isEditing && (
                                <wired-icon-button onClick={this.toggleEditing}>
                                    add
                                </wired-icon-button>
                            )}
                    </div>
                </h3>

                {!isLoading &&
                    this.state.isEditing && (
                        <div className="new-card-wrapper">
                            <wired-textarea
                                class="new-card-textarea"
                                placeholder=""
                                rows="3"
                                ref={node => {
                                    this.input = node;
                                }}
                            />

                            <div className="new-card-action">
                                <wired-icon-button onClick={this.handleAdd}>
                                    check
                                </wired-icon-button>
                                <wired-icon-button onClick={this.toggleEditing}>
                                    close
                                </wired-icon-button>
                            </div>
                        </div>
                    )}

                {cards.map(card => (
                    <wired-card key={card.id} class="card">
                        {card.message}
                    </wired-card>
                ))}
            </div>
        );
    }
}

export default Column;
