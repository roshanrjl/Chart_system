import { LockClosedIcon } from "@heroicons/react/20/solid";
import { useState } from "react";
import { useDispatch } from "react-redux";
import Button from "../components/Button";
import Input from "../components/Input";
import { register } from "../redux/authSlice";
import { registerUser } from "../api/userApi/userapi.jsx";
import { useNavigate } from "react-router-dom";

const Register = () => {
  const [data, setData] = useState({
    email: "",
    username: "",
    password: "",
  });
const [file, setFile] = useState()

  const dispatch = useDispatch();
  const navigate = useNavigate()

  const handleDataChange = (name) => (e) => {
    setData((prev) => ({
      ...prev,
      [name]: e.target.value,
    }));
  };

    const handleRegister = async () => {
      if(!file){
        alert("please upload image")
        return
      }
      const formData = new FormData()
      formData.append("email",data.email)
      formData.append("username",data.username)
      formData.append("password",data.password)
      formData.append("file",file)
      try {
        const response = await registerUser(formData)
        console.log("information from backend:", response)
        navigate("/login")
        
      } catch (error) {
        console.error(
          "Registration failed:",
          error?.response?.data?.message || error.message
        );
        alert("Registration failed. Please check the details and try again.");
      }
    };

  return (
    <div className="flex justify-center items-center flex-col h-screen w-screen">
      <h1 className="text-3xl font-bold">FreeAPI Chat App</h1>
      <div className="max-w-5xl w-1/2 p-8 flex justify-center items-center gap-5 flex-col bg-dark shadow-md rounded-2xl my-16 border-secondary border-[1px]">
        <h1 className="inline-flex items-center text-2xl mb-4 flex-col">
          <LockClosedIcon className="h-8 w-8 mb-2" /> Register
        </h1>

        <Input
          placeholder="Enter the email..."
          type="email"
          value={data.email}
          onChange={handleDataChange("email")}
          className="text-black"
        />
        <Input
          placeholder="Enter the username..."
          value={data.username}
          onChange={handleDataChange("username")}
          className="text-black"
        />
        <Input
          placeholder="Enter the password..."
          type="password"
          value={data.password}
          onChange={handleDataChange("password")}
          className="text-black"
        />

        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files[0])}
          className="mt-2"
          placeholder="upload the image"
        />

        <Button
          fullWidth
          disabled={Object.values(data).some((val) => !val)}
          onClick={handleRegister}
        >
          Register
        </Button>

        <small className="text-zinc-300">
          Already have an account?{" "}
          <a className="text-primary hover:underline" href="/login">
            Login
          </a>
        </small>
      </div>
    </div>
  );
};

export default Register;
