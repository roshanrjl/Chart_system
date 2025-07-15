import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { LocalStorage } from "../utils";
import { registerUser, loginUser, logoutUser } from "../api/userApi/userapi.jsx";

// Register async thunk
export const register = createAsyncThunk(
  "auth/register",
  async (credentials, thunkAPI) => {
    try {
      await registerUser(credentials);
      return true;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Registration failed"
      );
    }
  }
);

// Login async thunk
export const login = createAsyncThunk(
  "auth/login",
  async (credentials, thunkAPI) => {
    try {
      const res = await loginUser(credentials);
      // Assuming backend sends token and user info inside res.data.data
      const { accessToken, user } = res.data.data;
      console.log("token from backend:",accessToken)
      // Store token and user in localStorage
      LocalStorage.set("accessToken", accessToken);
      LocalStorage.set("user", user);

      return { user, accessToken };
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Login failed"
      );
    }
  }
);

// Logout async thunk
export const logout = createAsyncThunk(
  "auth/logout",
  async (_, thunkAPI) => {
    try {
      await logoutUser();
      LocalStorage.clear();
      return true;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Logout failed"
      );
    }
  }
);

const initialState = {
  user: LocalStorage.get("user") || null,
  accessToken: LocalStorage.get("accessToken") || null,
  registered: false,
  error: null,
  isLoading: false,
};

const authSlice = createSlice({
  name: "authentication",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // Login cases
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.error = null;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        console.log("User logged in:", state.user);
        console.log("Access token:", state.accessToken);
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });

    // Register cases
    builder
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
        state.registered = true;
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });

    // Logout cases
    builder.addCase(logout.fulfilled, (state) => {
      state.user = null;
      state.accessToken = null;
    });
  },
});

export default authSlice.reducer;
