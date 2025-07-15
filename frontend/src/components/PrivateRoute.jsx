import React from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

const PrivateRoute = ({ children }) => {
  // Access token and user from Redux store
  const {  user } = useSelector((state) => state.authentication);

  // If no token or user id, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Otherwise render child components
  return children;
};

export default PrivateRoute;
