import ClasesParticulares from "./components/ClasesParticulares";
import { BrowserRouter } from "react-router-dom";
import Perfil from './pages/Perfil';

function App() {
  return (
    <BrowserRouter>
      <Perfil />
    </BrowserRouter>
  );
}

export default App;