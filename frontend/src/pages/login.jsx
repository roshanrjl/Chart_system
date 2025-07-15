import { LockClosedIcon } from "@heroicons/react/20/solid";
import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { login } from "../redux/authSlice.jsx";
import Button from "../components/Button";
import Input from "../components/Input";

const Login = () => {
  const [data, setData] = useState({
    username: "",
    password: "",
  });

  const dispatch = useDispatch();
  const navigate = useNavigate();

  
  const { user, isLoading, error } = useSelector((state) => state.authentication);

  
  useEffect(() => {
    if (user) {
      navigate("/chat");
    }
  }, [user, navigate]);

  const handleDataChange = (name) => (e) => {
    setData({
      ...data,
      [name]: e.target.value,
    });
  };

  const handleLogin = async () => {
    try {
      const resultAction = await dispatch(login(data));

      if (login.fulfilled.match(resultAction)) {
       //  dispatch(connectionsocket());
        
      } else {
        setData({ username: "", password: "" });
        console.error("Login failed:", resultAction.payload);
      }
    } catch (error) {
      console.error("Something went wrong during login:", error);
    }
  };

  return (
    <div className="flex justify-center items-center flex-col h-screen w-screen">
      <h1 className="text-3xl font-bold">FreeAPI Chat App</h1>
      <div className="max-w-5xl w-1/2 p-8 flex justify-center items-center gap-5 flex-col bg-dark shadow-md rounded-2xl my-16 border-secondary border-[1px]">
        <h1 className="inline-flex items-center text-2xl mb-4 flex-col">
          <LockClosedIcon className="h-8 w-8 mb-2" /> Login
        </h1>

        <Input
          placeholder="Enter the username..."
          value={data.username}
          onChange={handleDataChange("username")}
        />
        <Input
          placeholder="Enter the password..."
          type="password"
          value={data.password}
          onChange={handleDataChange("password")}
        />
        <Button
          disabled={Object.values(data).some((val) => !val)}
          fullWidth
          onClick={handleLogin}
        >
          {isLoading ? "Logging in..." : "Login"}
        </Button>
        <small className="text-zinc-300">
          Don&apos;t have an account?{" "}
          <a className="text-primary hover:underline" href="/register">
            Register
          </a>
        </small>
        {error && <p className="text-red-500">{error}</p>}
      </div>
    </div>
  );
};

export default Login;
