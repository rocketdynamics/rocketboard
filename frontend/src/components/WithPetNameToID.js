import React from "react";
import { useQuery } from "@apollo/client";
import { useParams } from 'react-router-dom';
import { GET_RETROSPECTIVE_ID } from "../queries";

class ShouldUpdater extends React.Component {
    constructor(props) {
        super(props);
    }

    shouldComponentUpdate(nextProps, nextState) {
        return this.props.match.params.petName != nextProps.match.params.petName
    }

    render() {
        return this.props.children;
    }
}

function WithPetNameToID(props) {
    console.log("topetname")
    console.log(props)
    const { petName } = useParams();
    const { loading, error, data } = useQuery(GET_RETROSPECTIVE_ID, {
        variables: { petName },
    });

    if (!data || !data.retrospectiveByPetName) {
        return (
            <div className="page-retrospective">
                <div className={"retrospective-loading" + (loading ? "" : " loading-finished")}>
                    <pre className="loading-text">
                        R  O  C  K  E  T  B  O  A  R  D
                    </pre>
                </div>
            </div>
        )
    }
    return (<ShouldUpdater><props.component id={data.retrospectiveByPetName.id}/></ShouldUpdater>);
};

export default WithPetNameToID;
