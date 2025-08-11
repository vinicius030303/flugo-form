import { Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Avatar, IconButton, Menu, MenuItem } from "@mui/material";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import { useColorMode } from "../App";
import GroupIcon from '@mui/icons-material/Group';
// ⬇️ Alterado para importar MouseEvent como tipo
import { useState } from "react";
import type { MouseEvent } from "react";
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import logo from '../assets/logo.png';
import '../global.css'; // Importa o CSS global

const currentUser = {
  name: "Ge",
  avatarUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=Ge&gender=male",
};

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const { toggleColorMode } = useColorMode();
  const [darkMode, setDarkMode] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const openMenu = Boolean(anchorEl);

  const handleMenuClick = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    console.log("Usuário deslogado!");
    handleMenuClose();
  };

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
            <ListItemButton selected>
              <ListItemIcon>
                <GroupIcon />
              </ListItemIcon>
              <ListItemText primary="Colaboradores" />
              <ChevronRightIcon sx={{ color: 'text.secondary' }} />
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
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            p: 2,
          }}
        >
          <IconButton
            onClick={handleMenuClick}
            size="small"
            sx={{ ml: 2 }}
            aria-controls={openMenu ? 'account-menu' : undefined}
            aria-haspopup="true"
            aria-expanded={openMenu ? 'true' : undefined}
          >
            <Avatar src={currentUser.avatarUrl} alt={currentUser.name} />
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
                overflow: 'visible',
                filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                mt: 1.5,
                '& .MuiAvatar-root': {
                  width: 32,
                  height: 32,
                  ml: -0.5,
                  mr: 1,
                },
                '&::before': {
                  content: '""',
                  display: 'block',
                  position: 'absolute',
                  top: 0,
                  right: 14,
                  width: 10,
                  height: 10,
                  bgcolor: 'background.paper',
                  transform: 'translateY(-50%) rotate(45deg)',
                  zIndex: 0,
                },
              },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem onClick={handleLogout}>Sair</MenuItem>
          </Menu>

          <IconButton
            onClick={() => {
              // ⬇️ Corrigido tipo para boolean, já que o state é booleano
              setDarkMode((prev: boolean) => !prev);
              toggleColorMode();
            }}
            size="small"
            color="inherit"
          >
            {darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
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
          {children}
        </Box>
      </Box>
    </Box>
  );
};
