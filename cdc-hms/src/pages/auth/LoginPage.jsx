import { useNavigate } from "react-router-dom";
import LoginLayout from "../../layouts/LoginLayout";
import Card from "../../components/shared/Card";
import { Users, Stethoscope, FlaskConical, User, ShieldCheck, ArrowRight } from 'lucide-react';

const LoginPage = () => {
  const navigate = useNavigate();

  const portals = [
    {
      name: "Staff Portal",
      description: "Patient registration & queue management",
      path: "/login/staff",
      gradient: "from-blue-500 via-blue-600 to-blue-700",
      icon: Users,
      bgPattern: "from-blue-400/20 to-blue-600/20",
    },
    {
      name: "Doctor Portal",
      description: "Consultations, exams & prescriptions",
      path: "/login/doctor",
      gradient: "from-green-500 via-green-600 to-emerald-700",
      icon: Stethoscope,
      bgPattern: "from-green-400/20 to-emerald-600/20",
    },
    {
      name: "Lab Portal",
      description: "Test orders, results & critical alerts",
      path: "/login/lab",
      gradient: "from-purple-500 via-purple-600 to-violet-700",
      icon: FlaskConical,
      bgPattern: "from-purple-400/20 to-violet-600/20",
    },
    {
      name: "Patient Portal",
      description: "View records & track health data",
      path: "/login/patient",
      gradient: "from-cyan-500 via-cyan-600 to-blue-700",
      icon: User,
      bgPattern: "from-cyan-400/20 to-blue-600/20",
    },
    {
      name: "Admin Portal",
      description: "System management & user controls",
      path: "/login/admin",
      gradient: "from-orange-500 via-red-500 to-red-700",
      icon: ShieldCheck,
      bgPattern: "from-orange-400/20 to-red-600/20",
    },
  ];
  
  return (
    <LoginLayout>
      <Card title="Select Your Portal">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-2">
          {portals.map((portal) => {
            const IconComponent = portal.icon;
            return (
              <button
                key={portal.path}
                onClick={() => navigate(portal.path)}
                className={`
                  relative overflow-hidden
                  bg-gradient-to-br ${portal.gradient}
                  text-white p-8 rounded-2xl
                  hover:scale-[1.02] hover:shadow-2xl hover:-translate-y-1
                  active:scale-[0.98]
                  transition-all duration-300 ease-out
                  group
                  border border-white/20
                `}
              >
                {/* Animated gradient background */}
                <div className={`
                  absolute inset-0 
                  bg-gradient-to-br ${portal.bgPattern}
                  opacity-0 group-hover:opacity-100
                  transition-opacity duration-500
                `}></div>

                {/* Animated circle decoration */}
                <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                
                {/* Content */}
                <div className="relative z-10">
                  {/* Icon with animated container */}
                  <div className="
                    mb-6 
                    inline-flex items-center justify-center
                    w-20 h-20
                    bg-white/20 backdrop-blur-sm
                    rounded-2xl
                    group-hover:bg-white/30 group-hover:rotate-6 group-hover:scale-110
                    transition-all duration-300
                    shadow-lg
                  ">
                    <IconComponent 
                      size={48} 
                      strokeWidth={2}
                      className="group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                  
                  {/* Portal Name */}
                  <div className="font-bold text-2xl mb-3 text-center">
                    {portal.name}
                  </div>
                  
                  {/* Description - Always visible but enhanced on hover */}
                  <div className="
                    text-sm text-center
                    text-white/80 group-hover:text-white
                    transition-all duration-300
                    mb-4
                  ">
                    {portal.description}
                  </div>

                  {/* Arrow indicator - appears on hover */}
                  <div className="
                    flex items-center gap-2
                    text-sm font-semibold
                    opacity-0 group-hover:opacity-100
                    transform translate-x-0 group-hover:translate-x-2
                    transition-all duration-300
                  ">
                    <span>Access Portal</span>
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform duration-300" />
                  </div>
                </div>

                {/* Shimmer effect on hover */}
                <div className="
                  absolute inset-0
                  bg-gradient-to-r from-transparent via-white/20 to-transparent
                  translate-x-[-200%] group-hover:translate-x-[200%]
                  transition-transform duration-1000
                "></div>
              </button>
            );
          })}
        </div>
      </Card>
    </LoginLayout>
  );
};

export default LoginPage;