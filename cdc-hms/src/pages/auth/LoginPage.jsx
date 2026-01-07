import { useNavigate } from "react-router-dom";
import LoginLayout from "../../layouts/LoginLayout";
import Card from "../../components/shared/Card";

const LoginPage = () => {
  const navigate = useNavigate();

  const portals = [
    {
      name: "Staff Portal",
      icon: "👥",
      description: "For front desk and administrative staff",
      path: "/login/staff",
      gradient: "from-blue-500 to-blue-600",
    },
    {
      name: "Doctor Portal",
      icon: "⚕️",
      description: "For medical practitioners",
      path: "/login/doctor",
      gradient: "from-green-500 to-green-600",
    },
    {
      name: "Lab Portal",
      icon: "🔬",
      description: "For laboratory technicians",
      path: "/login/lab",
      gradient: "from-purple-500 to-purple-600",
    },
    {
      name: "Patient Portal",
      icon: "🏥",
      description: "For registered patients",
      path: "/login/patient",
      gradient: "from-cyan-500 to-cyan-600",
    },
    {
      name: "Admin Portal",
      icon: "🔐",
      description: "For system administrators",
      path: "/login/admin",
      gradient: "from-orange-500 to-red-600",
    },
  ];
  
  return (
    <LoginLayout>
      <Card title="Select Portal">
        <div className="grid grid-cols-2 gap-6">
          {portals.map((portal) => (
            <button
              key={portal.path}
              onClick={() => navigate(portal.path)}
              className={`bg-gradient-to-br ${portal.gradient} text-white p-8 rounded-xl hover:scale-105 hover:shadow-2xl transition-all duration-300 transform`}
            >
              <div className="text-5xl mb-3">{portal.icon}</div>
              <div className="font-semibold text-lg">{portal.name}</div>
            </button>
          ))}
        </div>
      </Card>
    </LoginLayout>
  );
};

export default LoginPage;
