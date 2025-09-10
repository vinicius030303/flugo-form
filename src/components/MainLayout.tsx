import type React from "react";
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
  Chip,
} from "@mui/material";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import GroupIcon from "@mui/icons-material/Group";
import BusinessIcon from "@mui/icons-material/Business";
import ListAltIcon from "@mui/icons-material/ListAlt";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import LogoutIcon from "@mui/icons-material/Logout";
import { useEffect, useState } from "react";
import type { MouseEvent } from "react";
import { NavLink, useLocation, useNavigate, Outlet } from "react-router-dom";

import { useColorMode } from "../App";
import { useAuth } from "@/contexts/AuthContext";
import logo from "../assets/logo.png";
import "../global.css";

// 🔴 contador em tempo real
import { db } from "@/services/firebase";
import { collection, onSnapshot } from "firebase/firestore";

export const MainLayout: React.FC = () => {
  const { toggleColorMode } = useColorMode();
  const [darkMode, setDarkMode] = useState(false);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const openMenu = Boolean(anchorEl);

  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleMenuClick = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleMenuClose = () => setAnchorEl(null);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login", { replace: true });
    } finally {
      handleMenuClose();
    }
  };

  const isColaboradores = location.pathname.startsWith("/colaboradores");
  const isDepartamentos = location.pathname.startsWith("/departamentos");
  const isLogs = location.pathname.startsWith("/logs");

  // 👇 total de colaboradores em tempo real
  const [totalColabs, setTotalColabs] = useState<number>(0);
  useEffect(() => {
    const colRef = collection(db, "colaboradores");
    const unsub = onSnapshot(colRef, (snap) => setTotalColabs(snap.size));
    return unsub;
  }, []);

  return (
    <Box sx={{ display: "flex", height: "100vh", width: "100%", overflow: "hidden" }}>
      <Drawer
        variant="permanent"
        sx={{
          width: 240,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: 240, boxSizing: "border-box" },
        }}
      >
        <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 1 }}>
          <img src={logo} alt="Logo Flugo" style={{ height: "24px" }} />
        </Box>

        <List>
          <ListItem disablePadding>
            <ListItemButton
              component={NavLink}
              to="/colaboradores"
              selected={isColaboradores}
              sx={{ gap: 1 }}
            >
              <ListItemIcon>
                <GroupIcon />
              </ListItemIcon>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: 1 }}>
                <ListItemText primary="Colaboradores" />
                <Chip
                  label={totalColabs}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ ml: "auto" }}
                />
              </Box>
              <ChevronRightIcon sx={{ color: "text.secondary" }} />
            </ListItemButton>
          </ListItem>

          <ListItem disablePadding>
            <ListItemButton
              component={NavLink}
              to="/departamentos"
              selected={isDepartamentos}
            >
              <ListItemIcon>
                <BusinessIcon />
              </ListItemIcon>
              <ListItemText primary="Departamentos" />
              <ChevronRightIcon sx={{ color: "text.secondary" }} />
            </ListItemButton>
          </ListItem>

          {/* ✅ Logs */}
          <ListItem disablePadding>
            <ListItemButton
              component={NavLink}
              to="/logs"
              selected={isLogs}
            >
              <ListItemIcon>
                <ListAltIcon />
              </ListItemIcon>
              <ListItemText primary="Logs" />
              <ChevronRightIcon sx={{ color: "text.secondary" }} />
            </ListItemButton>
          </ListItem>
        </List>
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          width: "100%",
        }}
      >
        {/* Top bar */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: 1,
            p: 2,
          }}
        >
          {user?.email && (
            <Typography variant="body2" color="text.secondary">
              {user.email}
            </Typography>
          )}

          <IconButton
            onClick={handleMenuClick}
            size="small"
            sx={{ ml: 1 }}
            aria-controls={openMenu ? "account-menu" : undefined}
            aria-haspopup="true"
            aria-expanded={openMenu ? "true" : undefined}
          >
            <Avatar
              src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(
                user?.email || "user"
              )}`}
              alt={user?.email || "Usuário"}
            />
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            id="account-menu"
            open={openMenu}
            onClose={handleMenuClose}
            onClick={handleMenuClose}
            PaperProps={{
              elevation: 0,
              sx: {
                overflow: "visible",
                filter: "drop-shadow(0px 2px 8px rgba(0,0,0,0.32))",
                mt: 1.5,
                "& .MuiAvatar-root": {
                  width: 32,
                  height: 32,
                  ml: -0.5,
                  mr: 1,
                },
                "&::before": {
                  content: '""',
                  display: "block",
                  position: "absolute",
                  top: 0,
                  right: 14,
                  width: 10,
                  height: 10,
                  bgcolor: "background.paper",
                  transform: "translateY(-50%) rotate(45deg)",
                  zIndex: 0,
                },
              },
            }}
            transformOrigin={{ horizontal: "right", vertical: "top" }}
            anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
          >
            <MenuItem onClick={handleLogout}>
              <LogoutIcon fontSize="small" style={{ marginRight: 8 }} />
              Sair
            </MenuItem>
          </Menu>

          <Tooltip title={darkMode ? "Tema claro" : "Tema escuro"}>
            <IconButton
              onClick={() => {
                setDarkMode((prev: boolean) => !prev);
                toggleColorMode();
              }}
              size="small"
              color="inherit"
            >
              {darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
          </Tooltip>
        </Box>

        <Box
          sx={{
            flexGrow: 1,
            p: 3,
            overflow: "auto",
            width: "100%",
            minWidth: 0,
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};
