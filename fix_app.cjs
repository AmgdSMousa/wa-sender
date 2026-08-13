const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// The botched replacement added a stray block before the nav menu.
// Let's remove it and fix the bottom user box.
const botchedBlock = `                <div className="flex-1 w-full flex flex-col justify-end mt-auto mb-6 px-4">
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 w-full">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-lg shadow-inner">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-sm font-bold text-white truncate">{user.name}</p>
                        <p className="text-xs text-slate-400 truncate">{isAdmin ? "Admin Account" : "Pro Plan User"}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        localStorage.removeItem("token");
                        localStorage.removeItem("user");
                        window.location.href = "/login";
                      }}
                      className="w-full bg-white/10 hover:bg-red-500/20 text-slate-300 hover:text-red-400 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
                    >
                      <LogOut className="w-4 h-4" /> تسجيل الخروج
                    </button>
                  </div>
                </div>
            </nav>`;

code = code.replace(botchedBlock, ''); // remove the mistakenly placed block

const oldUserBox = `                <div className="flex-1 w-full flex flex-col justify-end mt-auto mb-6 px-4">
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 w-full flex items-center gap-3 cursor-pointer hover:bg-white/10 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-lg shadow-inner">
                      A
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Amged Studio</p>
                      <p className="text-xs text-slate-400">Pro Plan (Active)</p>
                    </div>
                  </div>
                </div>
            </nav>`;

const newUserBox = `                <div className="flex-1 w-full flex flex-col justify-end mt-auto mb-6 px-4">
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 w-full">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-lg shadow-inner">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-sm font-bold text-white truncate">{user.name}</p>
                        <p className="text-xs text-slate-400 truncate">{isAdmin ? "Admin Account" : "Pro Plan User"}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        localStorage.removeItem("token");
                        localStorage.removeItem("user");
                        window.location.href = "/login";
                      }}
                      className="w-full bg-white/10 hover:bg-red-500/20 text-slate-300 hover:text-red-400 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
                    >
                      <LogOut className="w-4 h-4" /> تسجيل الخروج
                    </button>
                  </div>
                </div>
            </nav>`;

code = code.replace(oldUserBox, newUserBox);
fs.writeFileSync('src/App.tsx', code);
console.log('Fixed App.tsx successfully!');
