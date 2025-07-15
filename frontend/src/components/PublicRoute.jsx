import React, { Children }  from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

const PublicRoute=({children})=>{
    const { user}= useSelector((state)=>state.authentication)

    if(  user?._id){
        return <Navigate to="/chat" replace/>
    }
    return children;
}

export default PublicRoute;