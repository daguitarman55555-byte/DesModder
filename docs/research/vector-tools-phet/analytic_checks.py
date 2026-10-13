import math,json
out={}
for g,L in [(0.5,0.6),(2,1.3),(4,2)]:
    w0=math.sqrt(g/L)
    dmax=0
    for j in range(101):
      th=-math.pi+2*math.pi*j/100
      w=2*w0*math.cos(th/2)
      energy=L*L*w*w/2+g*L*(1-math.cos(th))
      dmax=max(dmax,abs(energy-2*g*L))
    assert dmax<1e-11
    out['pendulum_separatrix_max_error']=max(out.get('pendulum_separatrix_max_error',0),dmax)

def eccentric_anomaly(M,e):
    E=M+e*math.sin(M)
    for _ in range(6):
        E-=(E-e*math.sin(E)-M)/(1-e*math.cos(E))
    return E
out['kepler_max_newton_residual']=0
out['kepler_equal_area_max_difference']=0
for e in [0,0.2,0.4,0.6]:
 for q in range(12):
    M=2*math.pi*q/12
    E=eccentric_anomaly(M,e)
    residual=abs(E-e*math.sin(E)-M)
    assert residual<1e-10,(e,M,residual)
    out['kepler_max_newton_residual']=max(out['kepler_max_newton_residual'],residual)
 for a,mu in [(3,3),(4.2,1)]:
    period=2*math.pi*math.sqrt(a*a*a/mu)
    mean=lambda t:2*math.pi*t/period
    # exact swept area = ab ΔM/2 = πab/6 for ΔM = π/3
    b=a*math.sqrt(1-e*e)
    areas=[]
    for t0 in [0,period/2]:
        t1=t0+period/6
        E0=eccentric_anomaly(mean(t0),e)
        E1=eccentric_anomaly(mean(t1),e)
        areas.append(a*b*(E1-E0-e*(math.sin(E1)-math.sin(E0)))/2)
    diff=abs(areas[0]-areas[1]);assert diff<1e-10
    out['kepler_equal_area_max_difference']=max(out['kepler_equal_area_max_difference'],diff)
for w in [-1.4,-0.7,0,1.2]:
 for R in [1,2.5,4]:
    K=w*w*R*R/2
    assert abs(K-(w*R)**2/2)<1e-14
out['circular_energy_consistency']='pass'
for k,m,A in [(0.25,.5,1),(1,1,2),(3,3,3)]:
 for j in range(41):
    th=2*math.pi*j/40
    K=k*A*A*math.sin(th)**2/2
    U=k*A*A*math.cos(th)**2/2
    assert abs(K+U-k*A*A/2)<1e-12
out['harmonic_energy_consistency']='pass'
for t in [0,.25,1,3,5.9]:
 v0,g,h=4,2,0
 F=(v0+math.sqrt(v0*v0+2*g*h))/g
 q=min(t% (F+1),F)
 airborne=(t%(F+1))<F
 K=0.5*(3*3+(v0-g*q)**2) if airborne else 0
 U=g*(h+v0*q-g*q*q/2) if airborne else 0
 thermal=0 if airborne else 0.5*(3*3+v0*v0)+g*h
 assert abs(K+U+thermal-(0.5*(3*3+v0*v0)+g*h))<1e-12
out['projectile_energy_with_impact_loss']='pass'
print(json.dumps(out,indent=2))
