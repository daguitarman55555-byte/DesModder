# Book of Integrals — generalized families, exceptions, and coverage guide for Claude

Prepared from `Book of Integrals-20261123T064708Z-1-001.zip` (107 photographs, IMG_8551.HEIC–IMG_8657.HEIC). The photographed exercises run from 1 through 438. This is a mathematical handoff and family-level solution guide, not a transcription of the book or a claim that its answer key is correct.

## Instructions to Claude

Use this document to explain or develop a general treatment of **every numbered exercise in the supplied photographs**. The coverage tables below associate all 438 numbers with families. Repeated exercises belong to the same family; do not invent a separate technique for each coefficient choice. The unnumbered demonstrations are covered by the same families.

For each requested family provide: (1) parameterized integrand, (2) real domain and parameter assumptions, (3) recognition test, (4) substitution or derivation, (5) general result or terminating algorithm, (6) exceptional parameters, (7) representative specialization, and (8) derivative or convergence verification. For combinations, explain the sequence of families used. A general algorithm counts as coverage when a single short formula is inappropriate. Do not imply that every generalization has an elementary antiderivative.

Teach in small steps when tutoring: let the student try the key step before revealing a complete derivation unless they request a full solution. Use exact symbolic answers; decimals only for numerical approximations, with an error statement. Distinguish inverse functions (`arcsin`) from reciprocals (`csc`). Use arrows over vectors and hats for unit vectors if any physical applications are introduced.

**Evidence limits:** photographs were visually reviewed for family classification and source-specific traps. This is not a line-by-line certification of every answer-key entry. The photographed statement, not the answer key, defines the problem. Several definite integrals and an explicit derivative identity have incorrect printed answers/signs; see the correction register. Do not silently replace a suspicious printed integrand with a more convenient one.

## 1. Universal rules before applying a formula

- Parameters are real unless explicitly stated otherwise. `C` is an arbitrary constant on each connected open interval of the original domain. Different disconnected intervals may have different constants.
- For a real arbitrary power, work on a positive base unless the exponent has a separately specified real extension. Odd roots of negative numbers are real; principal complex powers need not represent them. Even roots are nonnegative.
- Always use \(\sqrt{g(x)^2}=|g(x)|\). For example, \(\sqrt{x^2}=|x|\), including after reciprocal substitutions.
- For real logarithms, \(\ln g\) requires \(g>0\); \(\ln|g|\) requires \(g\ne0\). Replacing one by the other changes the domain and must be stated.
- Cancellation does not restore excluded points of the original expression. A continuous extension can be discussed separately.
- Treat zero slopes, zero scale parameters, coincident factors, vanishing discriminants, and vanishing formula denominators **before dividing by them**.
- A definite integral is signed accumulation; geometric area uses absolute values. Split at sign changes and singularities. Evaluate improper integrals using one-sided limits. A Cauchy principal value is a different object.
- Verify an indefinite result by differentiating on its stated domain. Verify special parameter cases independently. Numerical agreement at a few points is useful evidence, not a proof.

## 2. Family catalog

### F01 — finite sums of powers and polynomial/binomial expansion

Family: \(\int\sum_{j=1}^{N}c_j x^{r_j}\,dx\), including products of finite polynomials and radicals that expand into such sums.

Define
\[
\Phi_r(x)=\begin{cases}x^{r+1}/(r+1),&r\ne-1,\\ \ln|x|,&r=-1.\end{cases}
\]
Then the answer is \(\sum c_j\Phi_{r_j}(x)+C\) on a valid real domain. A quotient by a monomial is handled by subtracting exponents term by term. For integer \(N\ge0\), expand \((a x^p+b)^N\) with the finite binomial theorem.

Exceptions: exponent −1 is logarithmic; negative powers exclude zero; fractional powers require domain decisions. A noninteger binomial exponent does **not** give a finite polynomial expansion. Use F04/F05 or an explicitly convergent infinite series. A zero denominator coefficient makes the original quotient undefined, not zero.

### F02 — affine primitives, exponentials, and basic trigonometric functions

For \(a\ne0\), \(\int f(ax+b)\,dx=F(ax+b)/a+C\) whenever \(F'=f\). If \(a=0\), integrate the defined constant \(f(b)\): \(xf(b)+C\).

Core primitives in variable \(u\):

| Integrand | Primitive |
|---|---|
| \(e^u\) | \(e^u\) |
| \(q^u,\ q>0,\ q\ne1\) | \(q^u/\ln q\) |
| \(1/u\) | \(\ln|u|\) |
| \(\sin u,\ \cos u\) | \(-\cos u,\ \sin u\) |
| \(\sec^2u,\ \csc^2u\) | \(\tan u,\ -\cot u\) |
| \(\sec u\tan u,\ \csc u\cot u\) | \(\sec u,\ -\csc u\) |
| \(\tan u,\ \cot u\) | \(-\ln|\cos u|,\ \ln|\sin u|\) |
| \(\sec u,\ \csc u\) | \(\ln|\sec u+\tan u|,\ \ln|\csc u-\cot u|\) |

For \(q=1\), the exponential is 1. Negative bases with arbitrary real exponents do not define a real function on an open interval. Preserve all trigonometric poles. Products like \((q^x-r^x)^2\) expand to three exponentials; if a resulting exponential rate is zero, its primitive is a constant times \(x\).

### F03 — algebraic/trigonometric simplification and absolute-square traps

Before selecting a method, expand, factor, combine exponentials, rationalize, or use \(\sin 2u=2\sin u\cos u\), \(\cos 2u=\cos^2u-\sin^2u\), \(1+\tan^2u=\sec^2u\), and their cotangent counterparts.

For \(\int\sqrt{(g(x))^2}\,dx\), partition at zeros of \(g\), integrate \(g\) or \(-g\), and match constants if a primitive across a zero is required.

Concrete family: \(\int|e^{ax+b}-c|\,dx\). For \(a\ne0,c>0\), the sign changes at \((\ln c-b)/a\); the sign on each side also depends on the sign of \(a\). If \(c\le0\), the expression inside the absolute value is positive. If \(a=0\), it is constant.

Four-factor family:
\[
y(y+h)(y+2h)(y+3h)+h^4=(y^2+3hy+h^2)^2.
\]
Thus its square-root integral is the integral of \(|y^2+3hy+h^2|\). The roots are \((-3h\pm\sqrt5\,|h|)/2\). For \(y=ax+b\), include \(1/a\) when \(a\ne0\); handle \(a=0\) separately. Altering the constant \(h^4\) generally destroys the perfect-square trick and may produce an elliptic integral.

### F04 — reverse chain rule and nested substitutions

Master family:
\[
\int g'(x)H(g(x))\,dx=\mathcal H(g(x))+C,\qquad \mathcal H'=H.
\]
This includes \(g'g^p\), \(g'/g\), \(g'e^{kg}\), \(g'q^g\), \(g'/(g^2+c^2)\), and \(g'/\sqrt{c^2-g^2}\). Apply F01, F02, F06, or F07 to the transformed integral.

Recognition: after setting \(u=g(x)\), **all** remaining factors, including the differential, must be expressible in \(u\). A resemblance between numerator and derivative is insufficient. Split off a derivative multiple and treat the remainder if necessary.

Nested examples: \(u=\sqrt x\), \(u=\ln x\), \(u=e^x\), \(u=x^2\), \(u=\sin x\). With \(g\) constant, the original product is zero only where the rest is defined; do not manufacture \(0\cdot\infty\).

### F05 — powers times binomials, root manipulation, and rational powers

Family: \(\int x^m(A+Bx^n)^p\,dx\). The especially useful elementary subfamily is
\[
m=nk+n-1,\quad k=0,1,2,\ldots,\quad Bn\ne0.
\]
With \(u=A+Bx^n\),
\[
\int x^{nk+n-1}(A+Bx^n)^p dx
=\frac1{nB^{k+1}}\sum_{j=0}^{k}\binom{k}{j}(-A)^{k-j}\Phi_{p+j}(u)+C.
\]
Each \(p+j=-1\) produces a logarithm, not division by zero. This directly covers odd powers multiplying powers of a quadratic, and powers such as \(x^5\sqrt{x^3+1}\).

If \(B=0\), \(A=0\), or \(n=0\), simplify the original expression before this formula. For rational powers of \(x\), use \(x=t^L\), where \(L\) is a common multiple of the exponent denominators, with a valid branch. For \(R(x,\sqrt{ax+b})\), use \(t=\sqrt{ax+b}\), \(x=(t^2-b)/a\), to obtain a rational function when \(R\) is rational and \(a\ne0\).

Do not promise elementary results for arbitrary \(m,n,p\). After normalization, incomplete beta or hypergeometric representations are available on specified branches; a safe exact alternative is a base-point integral or a locally convergent binomial series. The elementary subfamily above is intentionally narrower and directly covers the book's root-manipulation exercises.

### F06 — all reciprocal quadratics and linear-over-quadratic integrals

Let \(Q(x)=ax^2+bx+c\), \(D=4ac-b^2\), and first assume \(a\ne0\). Define \(J=\int dx/Q(x)\):
\[
J=\begin{cases}
\dfrac2{\sqrt D}\arctan\!\dfrac{2ax+b}{\sqrt D},&D>0,\\[4pt]
-\dfrac2{2ax+b},&D=0,\\[4pt]
\dfrac1{\sqrt{-D}}\ln\left|\dfrac{2ax+b-\sqrt{-D}}{2ax+b+\sqrt{-D}}\right|,&D<0.
\end{cases}
\]
Then
\[
\int\frac{mx+n}{Q(x)}dx
=\frac m{2a}\ln|Q(x)|+\left(n-\frac{mb}{2a}\right)J+C.
\]
This is the general form of the book's “P.U.N.” technique. It covers derivative matching, completing the square, real distinct roots, and repeated roots in one decision tree.

If \(a=0,b\ne0\), divide by the linear denominator and use F01/F02. If \(a=b=0,c\ne0\), integrate the numerator divided by \(c\). If all denominator coefficients vanish, the integrand is undefined. Roots of \(Q\) remain excluded even if canceled. A real inverse-hyperbolic-tangent formula cannot be used outside its real domain without an appropriate alternative logarithmic form.

### F07 — quadratic radicals and rational functions of a quadratic radical

Family: \(\int R(x,\sqrt{Q(x)})\,dx\), with \(R\) rational. Complete the square, shift and scale, then reduce to the following primitives (\(d>0\)):

| Integrand | Primitive |
|---|---|
| \(1/\sqrt{d^2-u^2}\) | \(\arcsin(u/d)\) |
| \(1/\sqrt{u^2+d^2}\) | \(\operatorname{arsinh}(u/d)\) |
| \(1/\sqrt{u^2-d^2}\) | \(\ln|u+\sqrt{u^2-d^2}|\) |
| \(\sqrt{d^2-u^2}\) | \(\tfrac12[u\sqrt{d^2-u^2}+d^2\arcsin(u/d)]\) |
| \(\sqrt{u^2+d^2}\) | \(\tfrac12[u\sqrt{u^2+d^2}+d^2\operatorname{arsinh}(u/d)]\) |
| \(\sqrt{u^2-d^2}\) | \(\tfrac12[u\sqrt{u^2-d^2}-d^2\ln|u+\sqrt{u^2-d^2}|]\) |

Require \(Q>0\) for reciprocal square roots and \(Q\ge0\) for roots; antiderivative identities are interpreted on open intervals. For \(Q=a(x-h)^2\), retain \(\sqrt a\,|x-h|\) when \(a>0\). If the leading coefficient is zero, route to F05. A negative radicand throughout gives no real interval of definition.

For \((mx+n)/\sqrt Q\), write \(mx+n=\lambda Q'+\mu\); the derivative part integrates to \(2\lambda\sqrt Q\). For higher polynomial numerators, shift to the completed-square variable and reduce powers, or use a trig/hyperbolic substitution. The substitutions \(u=d\sin\theta\), \(u=d\tan\theta\), \(u=d\sec\theta\) require a branch with the correct sign of the resulting root. Hyperbolic substitutions are often cleaner on exterior intervals.

General elementary algorithm: parameterize the conic \(v^2=Q(x)\). From any real point \((x_0,v_0)\), set \(v=v_0+t(x-x_0)\), solve the second intersection rationally for \(x(t)\), then integrate a rational function of \(t\) using F08. Cover any excluded parameterization point using another chart. This gives an algorithm for all rational functions of **one quadratic square root**, including F16's difficult-looking examples.

### F08 — arbitrary rational functions, partial fractions, and factorization

Family: \(\int P(x)/Q(x)\,dx\) for polynomials and \(Q\not\equiv0\). Cancel common factors while recording original exclusions. Perform polynomial division if the numerator degree is at least the denominator degree. Over the reals, decompose the proper fraction into
\[
\sum_{r,j}\frac{A_{r,j}}{(x-r)^j}
+\sum_{q,j}\frac{B_{q,j}x+C_{q,j}}{q(x)^j},
\]
where \(q\) are irreducible real quadratics. Include **every power** through each factor's multiplicity. Linear terms use F01; quadratic numerators use derivative splitting and F06/reduction.

A useful repeated-quadratic recurrence, for \(d>0,k\ge2\), is
\[
J_k=\int\frac{du}{(u^2+d^2)^k}
=\frac{u}{2d^2(k-1)(u^2+d^2)^{k-1}}
+\frac{2k-3}{2d^2(k-1)}J_{k-1}.
\]

The rational-root theorem gives candidates only for integer-coefficient polynomials (after clearing rational denominators). Absence of rational roots does not preclude real factorization or elementary integration. Parameter changes can merge roots, change quadratic discriminants, or lower degree; recompute the decomposition in those cases.

For a square-free denominator with simple complex roots \(r\), an alternative is \(\sum_r P(r)/Q'(r)\,\operatorname{Log}(x-r)\), after division. Pair conjugate terms to obtain a real result. Never replace a complex logarithm by \(\ln|x-r|\): that discards its argument and generally loses the correct derivative. Higher-degree polynomial roots may be represented exactly as algebraic numbers even when radicals are unavailable.

### F09 — two repeated affine factors and a ratio substitution

Family: \(\int dx/[(x+a)^m(x+b)^n]\), initially integers \(m,n\ge1\). If \(a\ne b\), let \(t=(x+a)/(x+b)\). Then
\[
\int\frac{dx}{(x+a)^m(x+b)^n}
=(b-a)^{1-m-n}\int t^{-m}(1-t)^{m+n-2}\,dt.
\]
Expand the nonnegative integer power and use F01. If \(a=b\), it is simply a single power \((x+a)^{-m-n}\), with a logarithm when \(m+n=1\). For arbitrary real exponents, branch restrictions apply and the transformed integral is an incomplete-beta type; finite expansion is no longer automatic. Independent affine factors can first be normalized when their slopes are nonzero.

### F10 — polynomial times exponential/trigonometric functions

For a polynomial \(P\) of degree \(N\) and \(\lambda\ne0\),
\[
\int P(x)e^{\lambda x}dx
=e^{\lambda x}\sum_{j=0}^{N}\frac{(-1)^jP^{(j)}(x)}{\lambda^{j+1}}+C.
\]
This is repeated/tabular integration by parts. For \(P(x)e^{ax}\cos(bx+c)\) or the sine version, use \(\lambda=a+ib\) and take the real or imaginary part after multiplying by \(e^{ic}\). If \(a=b=0\), integrate the resulting constant multiple of \(P\).

For a constant polynomial:
\[
\int e^{ax}\cos(bx+c)dx=\frac{e^{ax}[a\cos(bx+c)+b\sin(bx+c)]}{a^2+b^2},
\]
\[
\int e^{ax}\sin(bx+c)dx=\frac{e^{ax}[a\sin(bx+c)-b\cos(bx+c)]}{a^2+b^2}.
\]
Include \(+C\). For noninteger polynomial-like powers, tabular differentiation need not terminate; do not use this finite formula without a polynomial.

### F11 — logarithms and polynomial/rational factors

On \(x>0\), for real \(p\ne-1\),
\[
\int x^p\ln x\,dx=x^{p+1}\left(\frac{\ln x}{p+1}-\frac1{(p+1)^2}\right)+C.
\]
At \(p=-1\), the result is \((\ln x)^2/2+C\). More generally, for integer \(k\ge1\), integration by parts gives
\[
I_{p,k}=\frac{x^{p+1}(\ln x)^k}{p+1}-\frac{k}{p+1}I_{p,k-1}.
\]
For \(p=-1\), set \(u=\ln x\), and integrate \(u^k\), including a logarithm at \(k=-1\).

For polynomial \(P\), \(\int P(x)\ln|Q(x)|dx\): choose polynomial primitive \(V'=P\) and use \(V\ln|Q|-\int VQ'/Q\), a rational integral when \(Q\) is polynomial. This handles shifted/quadratic logarithms and logarithms of rational functions. If the source has \(\ln Q\), retain \(Q>0\). An arbitrary rational multiplier does not always remain elementary: \(\ln(1+x)/x\) leads to F24.

### F12 — inverse trigonometric factors and rational remainders

For polynomial \(P\), integrate \(P(x)\arctan(ax+b)\) by parts, differentiating arctan; the remainder is rational and belongs to F08. Arcsin/arccos instead produce rational functions of a quadratic square root, handled by F07. For a rational multiplier, choose a useful primitive; this is not universally elementary (see \(\arctan(ax)/x\), F24).

Base cases:
\[
\int\arcsin u\,du=u\arcsin u+\sqrt{1-u^2},\quad
\int\arccos u\,du=u\arccos u-\sqrt{1-u^2},
\]
\[
\int\arctan u\,du=u\arctan u-\tfrac12\ln(1+u^2).
\]
Include constants and affine scale factors. Arcsin/arccos require \(|u|\le1\). For the common real convention \(\operatorname{arcsec}u=\arccos(1/u)\), its derivative is \(1/(|u|\sqrt{u^2-1})\), not \(1/(u\sqrt{u^2-1})\) on both branches. Treat \(u>1\) and \(u<-1\) separately. For exponentials multiplying inverse trig, substitute \(u=e^{kx}\) first if it makes the weight a polynomial.

### F13 — powers of sine and cosine

Family: \(\int\sin^m(ax+b)\cos^n(ax+b)dx\).

For nonnegative integers: if \(m\) is odd, save one sine and use \(u=\cos(ax+b)\); if \(n\) is odd, save one cosine and use \(u=\sin(ax+b)\). If both are even, repeatedly use half-angle identities. For negative integer powers, use rational trig methods (F15). An affine slope of zero gives a constant only when the original expression is defined.

For real exponents on \(0<\theta=ax+b<\pi/2\), \(a\ne0\), the extension is
\[
\frac1{2a}B_{\sin^2\theta}\!\left(\frac{m+1}{2},\frac{n+1}{2}\right)+C.
\]
The integral-definition version of this beta expression assumes \(m,n>-1\). Other exponents require an analytically continued or base-point version. Outside the first quadrant, branch and sign adjustments are necessary; do not use the formula globally without them.

Mixed angles must be simplified first: for instance \(\sin^4(2x)\cos^5x=16\sin^4x\cos^9x\). Irrational exponents generally do not share the integer parity algorithms.

### F14 — tangent/secant and cotangent/cosecant powers

Family: \(\int\sec^m\theta\tan^n\theta\,dx\), \(\theta=ax+b\). For integer powers, if \(m\ge2\) is even, save \(\sec^2\theta\) and substitute tan. If \(n\ge1\) is odd and a secant factor is available, save \(\sec\theta\tan\theta\) and substitute sec. Otherwise reduce or use F15.

In variable \(u\), useful recurrences are
\[
\int\sec^m u\,du=\frac{\sec^{m-2}u\tan u}{m-1}
+\frac{m-2}{m-1}\int\sec^{m-2}u\,du\quad(m>1),
\]
\[
\int\tan^n u\,du=\frac{\tan^{n-1}u}{n-1}-\int\tan^{n-2}u\,du\quad(n>1).
\]
Base cases include \(\int1\), \(\int\tan\), and \(\int\sec\). Cot/csc analogues follow by \(u\mapsto\pi/2-u\), including the differential sign. Singularities of sec/csc/tan/cot remain excluded.

For a rational power \(\tan^{p/q}\theta\), a local real substitution \(t=\tan^{1/q}\theta\) gives \(q t^{p+q-1}/[a(1+t^{2q})]\), a rational integral for integers \(p,q\), \(q>0\). With even \(q\), require \(\tan\theta\ge0\). This covers \(\sqrt{\tan x}\).

### F15 — products of different frequencies and general rational trigonometry

Use product-to-sum for sine/cosine products at frequencies \(a,b\). If \(a+b=0\) or \(a-b=0\), integrate the resulting constant term directly; do not divide by the zero frequency. Phases and zero frequencies are allowed after this case split.

For \(R(\sin\theta,\cos\theta)\), \(\theta=kx+\phi\), rational \(R\), and \(k\ne0\), set
\[
t=\tan(\theta/2),\quad \sin\theta=\frac{2t}{1+t^2},\quad
\cos\theta=\frac{1-t^2}{1+t^2},\quad dx=\frac{2dt}{k(1+t^2)}.
\]
Then use F08. The chart fails at \(\theta=(2j+1)\pi\); split the interval and join primitives appropriately even if the original function is smooth there.

For \(1/(A+B\cos\theta+C\sin\theta)\), the transformed integral is
\[
\frac2k\int\frac{dt}{(A-B)t^2+2Ct+(A+B)}.
\]
Use F06 and its linear/constant degeneracies. The sign of \(A^2-B^2-C^2\) controls the generic arctangent/log/repeated-root cases, but first check whether \(A-B=0\).

For a homogeneous quadratic in sine and cosine, dividing by \(\cos^2\theta\) and setting \(t=\tan\theta\) often gives a simpler quadratic rational integral. Handle chart boundaries. When frequencies are commensurable, reduce to a common fundamental angle; unrelated real frequencies do not automatically reduce to a rational function of one half-angle variable.

### F16 — radical denominators, reciprocal substitutions, and conjugates

This family is algorithmic and has several branches:

1. \(R(x)/\sqrt{px+q}\): use \(t=\sqrt{px+q}\), then F08; if \(p=0\), the radical is constant or the expression is undefined.
2. \(1/[(ax+b)\sqrt{px^2+qx+r}]\): use \(ax+b=1/t\), then F07. **Keep** \(\sqrt{t^{-2}}=1/|t|\); split by the sign of \(t\). If \(a=0\), return to F07 with a constant factor.
3. \(1/[(ax^2+b)\sqrt{px^2+q}]\): \(x=1/t\) can help, but \(1/|t|\) again appears. Alternatively use the conic algorithm in F07.
4. \(1/(\sqrt{A(x)}\pm\sqrt{B(x)})\): multiply by the conjugate and divide by \(A-B\). Retain original exclusions. If \(A-B\equiv0\), a difference denominator is identically zero; a sum simplifies to \(2\sqrt A\) when defined.
5. Reciprocal quartic special case:
\[
\int\frac{x^2-a^2}{(x^2+a^2)\sqrt{x^4+b x^2+a^4}}dx.
\]
Set \(u=\sqrt{x^4+b x^2+a^4}/x\), locally with \(x\ne0\). Direct differentiation gives \(du/(u^2+2a^2-b)\), so F06 applies. When \(2a^2-b=0\), use \(-1/u\); when negative, use the logarithmic branch. Handle \(a=0\), zeros, and any removable chart point from the original integrand. Exercise 242 is \(a=1,b=0\).

A generic quartic radical is **not** a quadratic radical and is not covered by the conic method; special identities like branch 5 are essential. Generic quartic radicals can lead to elliptic integrals.

### F17 — definite integrals, absolute values, and reflection symmetry

Evaluate \(F(b)-F(a)\) only after domain and convergence checks. For \(\int_a^b|f(x)|dx\), find every sign-change point in the interval, split, and integrate with the appropriate sign. Repeated roots may not change sign. Parameters can move roots across endpoints and change the piecewise answer.

Reflection identity:
\[
\int_a^bf(x)dx=\int_a^bf(a+b-x)dx.
\]
Consequences, provided the relevant integrals exist:

- Odd integrable \(f\) on \([-L,L]\): integral zero. Even integrable \(f\): twice the integral on \([0,L]\).
- If \(w(a+b-x)=w(x)\), then \(\int_a^b xw(x)dx=(a+b)\int_a^bw(x)dx/2\).
- If \(f(x)+f(a+b-x)=K\), the integral is \(K(b-a)/2\).

Oddness does not make an ordinary divergent integral converge. Example: \(1/x\) on a symmetric interval only has a principal value, not an ordinary improper integral.

### F18 — complementary ratios and the book's “S.E.-One” family

For even integrable \(E\) and \(k(x)k(-x)=1\), with \(1+k\ne0\) and the integrals well-defined,
\[
\int_{-L}^{L}\frac{E(x)}{1+k(x)}dx=\frac12\int_{-L}^{L}E(x)dx.
\]
Important subfamily: \(k(x)=e^{h(x)}\), \(h\) odd. This includes \(q^x\), \(q>0\), including \(q=1\).

On \([0,\pi/2]\),
\[
\int_0^{\pi/2}\frac{\sin^p x}{\sin^p x+\cos^p x}dx=\frac\pi4
\]
for every real \(p\) using interior real powers and endpoint limits. Its cosine counterpart has the same value. For \(p=0\), interpret the endpoint values by continuity; no need to evaluate \(0^0\).

A positive constant added to an exponential need not produce a reflection pair on arbitrary endpoints. For \(1/(c+q^x)\), check \(q^{a+b}=c^2\) if using reflection on \([a,b]\); otherwise use an elementary exponential substitution. Negative \(k\) may introduce poles, invalidating a naive symmetry argument.

### F19 — Wallis/beta integrals and logarithmic trigonometric integrals

For \(m,n>-1\),
\[
\int_0^{\pi/2}\sin^m x\cos^n x\,dx
=\frac12 B\!\left(\frac{m+1}{2},\frac{n+1}{2}\right).
\]
For \(W_n=\int_0^{\pi/2}\sin^n x\,dx\), use \(W_0=\pi/2\), \(W_1=1\), and \(W_n=(n-1)W_{n-2}/n\) for integers \(n\ge2\). The cosine integral is the same. The endpoint restrictions \(m,n>-1\) are necessary for ordinary convergence.

Differentiation in the exponents produces integrals with \(\ln\sin x\) and \(\ln\cos x\), with justification on compact parameter ranges above −1. In particular,
\[
\int_0^{\pi/2}\ln\sin x\,dx
=\int_0^{\pi/2}\ln\cos x\,dx=-\frac\pi2\ln2,
\qquad \int_0^{\pi/2}\ln\sec x\,dx=\frac\pi2\ln2.
\]
These have integrable logarithmic endpoint singularities. A useful quadratic-trig family, \(a,b>0\), is
\[
\int_0^{\pi/2}\frac{dx}{a^2\cos^2x+b^2\sin^2x}=\frac\pi{2ab},\qquad
\int_0^{\pi/2}\frac{\cos^2x\,dx}{a^2\cos^2x+b^2\sin^2x}=\frac\pi{2a(a+b)}.
\]
Do not substitute \(a=0\) or \(b=0\) into these formulas; recheck convergence and cancellation separately.

### F20 — rational functions of exponentials and logarithmic oscillations

For rational \(R\), \(\int R(e^{kx})dx\), \(k\ne0\), becomes \(\int R(u)/(ku)\,du\) with \(u=e^{kx}>0\). Commensurable exponential rates can similarly use a common exponential variable. At \(k=0\), the integrand is constant if defined. Incommensurable rates need a separate analysis.

For functions of \(\ln x\), \(x>0\), set \(t=\ln x\). A weight \(x^pdx\) becomes \(e^{(p+1)t}dt\). This connects \(\sin^2(\ln x)\) to F10 and power reduction. For example, for \(p>-1\),
\[
\int_0^1x^p\sin^2(b\ln x)dx
=\frac{2b^2}{(p+1)[(p+1)^2+4b^2]}.
\]
For \(b=0\), the integrand is identically zero on \(x>0\); at other \(b\), \(p\le-1\) does not give an ordinary convergent nonnegative integral. Shifting the log phase requires the general F10 calculation, not this particular formula.

### F21 — recognition of a total product derivative

Family: \(\int e^{ax}[aH(x)+H'(x)]dx=e^{ax}H(x)+C\). More generally \(\int[A'B+AB']dx=AB+C\). This should be tested before lengthy integration by parts.

Exercise 393: \(H(x)=\cot(x/2)=\sin x/(1-\cos x)\), for which \(H\prime=-1/(1-\cos x)\). Its integrand is \(e^x(-H-H\prime)\), so a primitive is \(-e^x\cot(x/2)\). Keep its poles. More generally, \(e^{ax}[c-aH-H\prime]\) has primitive \(c e^{ax}/a-e^{ax}H\) for \(a\ne0\), and \(cx-H\) at \(a=0\).

### F22 — parameter differentiation and improper integral families

Differentiate under the integral only with a domination/convergence argument, or first work on a finite truncated interval and justify the limiting operation. Fix the parameter-integration constant by a known parameter value.

**Power/log quotient (417):** for real \(\alpha,\beta>-1\),
\[
\int_0^1\frac{x^\alpha-x^\beta}{\ln x}dx
=\ln\frac{\alpha+1}{\beta+1}.
\]
At \(x=1\), use the removable limit \(\alpha-\beta\). If exponents coincide, the numerator is identically zero on \((0,1)\), even in cases outside the generic convergence range. Unequal exponents with a minimum at or below −1 diverge at zero.

**Arctangent difference (423):** for \(a,b>0\),
\[
\int_0^\infty\frac{\arctan(ax)-\arctan(bx)}x dx=\frac\pi2\ln\frac ab.
\]
For \(a,b<0\), the result is \(-\pi\ln(|a|/|b|)/2\). Opposite signs or exactly one zero produce a logarithmically divergent tail. If \(a=b\), including both zero, the integrand is zero.

**Logarithmic rational moment (424):** for \(c>0,a>0\),
\[
\int_0^\infty\frac{\ln(cx)}{x^2+a^2}dx=\frac\pi{2a}\ln(ca).
\]
Derive by scaling and inversion \(x\mapsto1/x\) in the normalized logarithmic moment. Nonpositive \(c\) is outside the real log domain; \(a=0\) is singular.

**Damped sine integral (425):** for \(s>0\) and real \(b\),
\[
\int_0^\infty e^{-sx}\frac{\sin(bx)}x dx=\arctan(b/s).
\]
At \(s=0,b\ne0\), the ordinary oscillatory improper integral exists conditionally and equals \(\operatorname{sgn}(b)\pi/2\); justify the limit, not just substitution. For \(b=0\), it is zero. Negative damping generally causes divergence.

**Logarithm of an affine cosine (426):** if \(A>|B|\),
\[
\int_0^\pi\ln(A+B\cos x)dx
=\pi\ln\frac{A+\sqrt{A^2-B^2}}2.
\]
At \(A=|B|>0\), the same limiting formula holds as an improper integral. If \(A=B=0\), it does not. If \(A<|B|\), the real logarithm is not defined throughout; \(\ln|A+B\cos x|\) is a different problem. A useful parameterization is \(A=1+r^2,B=-2r\), giving 0 for \(|r|\le1\) and \(2\pi\ln|r|\) for \(|r|>1\), with endpoint limits at \(r=\pm1\).

### F23 — convergent-series integration and non-elementary trigonometric/exponential kernels

An analytic function can be integrated term by term inside its convergence interval; smoothness alone is insufficient to guarantee equality to its Taylor series. At endpoints or infinity, establish a separate interchange/limit argument. Give a remainder estimate when reporting a truncated numerical answer.

Core exact series:
\[
\int_0^z\frac{\sin(at)}t dt
=\sum_{k=0}^{\infty}\frac{(-1)^k(az)^{2k+1}}{(2k+1)(2k+1)!}
=\operatorname{Si}(az),
\]
\[
\int_0^z\frac{e^{at}-1}t dt
=\sum_{k=1}^{\infty}\frac{(az)^k}{k\,k!},
\qquad
\int_0^z\frac{1-e^{-at}}t dt
=\sum_{k=1}^{\infty}\frac{(-1)^{k+1}(az)^k}{k\,k!}.
\]
These converge for every finite real \(az\). Their apparent singularities at zero are removable. In contrast \((\sin(ax)-c)/x\) has a nonremovable \(-c/x\) term if \(c\ne0\). A finite interval away from zero is fine; a crossing of zero is not an ordinary improper integral.

General family \(\int x^m\cos(ax^n)dx\), on a suitable real interval: integrate
\(\sum_{k\ge0}(-1)^ka^{2k}x^{m+2nk}/(2k)!\) term by term, replacing any exponent −1 with a logarithm. This yields elementary subcases when a suitable chain-rule weight or another identity is present, but not all exponents do so. Exercise 297, literally as photographed, has the exact representation
\[
\int\frac{\cos(x^3)-4}{x^2}dx
=\frac3x+\sum_{k=1}^{\infty}\frac{(-1)^kx^{6k-1}}{(2k)!(6k-1)}+C,\quad x\ne0.
\]
This is an exact convergent series, not a finite elementary formula and not a divergent asymptotic expansion. It avoids changing the printed \(x^3\) to \(1/x\).

Another worked-example family is
\[
\int_0^L\frac{1-\cos(ax)}{x^2}dx
=a\operatorname{Si}(aL)-\frac{1-\cos(aL)}L,\qquad L>0.
\]
At \(a=0\), it is zero. Obtain this by parts, with the zero-endpoint boundary limit evaluated explicitly.

### F24 — dilogarithms, inverse-tangent integrals, and exponential log integrals

Define \(\operatorname{Li}_2(z)=\sum_{n\ge1}z^n/n^2\) for \(|z|\le1\), then use analytic continuation with a stated branch outside that disk. The principal dilogarithm has its cut along \([1,\infty)\). From the integral definition,
\[
\frac d{dz}\operatorname{Li}_2(z)=-\frac{\operatorname{Log}(1-z)}z.
\]
The singularity at zero is removable. Consequently,
\[
\int\frac{\ln(1+ax)}x dx=-\operatorname{Li}_2(-ax)+C
\]
on a compatible real/complex domain. For real logs, require \(1+ax>0\); the value of the integrand at zero is the limit \(a\).

For real \(a,x\),
\[
T(ax):=\int_0^x\frac{\arctan(at)}t dt
=\frac{\operatorname{Li}_2(iax)-\operatorname{Li}_2(-iax)}{2i}.
\]
For \(|ax|\le1\), this is \(\sum_{k\ge0}(-1)^k(ax)^{2k+1}/(2k+1)^2\). The real function extends to all real \(ax\); the displayed power series cannot be used past its convergence disk. At \(a=0\), it is zero.

For \(k>0\),
\[
\int_0^\infty\ln(1-qe^{-kx})dx=-\frac{\operatorname{Li}_2(q)}k\quad(q\le1\text{ real}),
\]
where \(q=1\) has an integrable logarithmic endpoint singularity. For \(|q|\le1\), use the convergent series with justified integration; for \(q<-1\), use the real integral definition/continuation, not the same unrestricted series.

Specializations:
\[
\int_0^\infty\ln(1-e^{-kx})dx=-\frac{\pi^2}{6k},\quad
\int_0^\infty\ln(1+e^{-kx})dx=\frac{\pi^2}{12k},
\]
\[
\int_0^\infty\ln\frac{e^{kx}-1}{e^{kx}+1}dx=-\frac{\pi^2}{4k}.
\]
The ratio formula follows from the difference of the preceding two integrals. A base \(b^x\) corresponds to \(k=\ln b\), requiring \(b>1\) for these real half-line forms. At \(k=0\), generic formulas fail; analyze the original constant integrand, with \(q=0\) the trivial zero exception. For \(k<0\), convergence/domain behavior changes.

Special values: \(\operatorname{Li}_2(1)=\pi^2/6\), \(\operatorname{Li}_2(-1)=-\pi^2/12\), and
\[
\operatorname{Li}_2(i)=-\frac{\pi^2}{48}+iG,\qquad
G=\sum_{k=0}^{\infty}\frac{(-1)^k}{(2k+1)^2}.
\]
Under composition with \(1/z\), the correct derivative is **positive**:
\[
\frac d{dz}\operatorname{Li}_2(1/z)=\frac{\operatorname{Log}(1-1/z)}z.
\]
Use compatible local branches; \(z=0\) is excluded and the branch cut must be respected. Do not assert a global complex log quotient identity without branch analysis.

### F25 — infinite nested radicals and limits

Specify the sequence before manipulating an infinite radical. For the natural finite-depth sequence
\[
R_1(x)=\sqrt x,\quad R_{n+1}(x)=\sqrt{xR_n(x)},\quad x\ge0,
\]
\(R_n=x^{1-2^{-n}}\) for \(x>0\), so \(R_n\to x\), including the separate value 0 at \(x=0\). Thus the limiting integrand in exercise 397 is \(x\) on \([0,\infty)\), with primitive \(x^2/2+C\).

The fixed-point equation \(R=\sqrt{xR}\) alone has both \(R=0\) and \(R=x\); it does not prove which limit the finite radicals select. Negative real \(x\) is not permitted by the innermost square root in this definition. A complex version requires its own branch and convergence treatment. Interchanging the sequence limit with an integral also needs justification, for example dominated convergence on a compact nonnegative interval.

## 3. Coverage index for exercises 1–269

These ranges are a compact mapping, not a claim that every exercise in a chapter requires the chapter's advertised method. A plus sign means combine the indicated families.

| Exercise(s) | Family/route | Photo(s) |
|---|---|---|
| 1–19 | F01: expand and integrate finite powers | 8551–8553 |
| 20–30 | F02+F03; F01 for algebraic terms | 8554–8555 |
| 31 | F03 absolute exponential square | 8555 |
| 32–39 | F01–F03; retain original canceled exclusions | 8555–8556 |
| 40–51 | F04 with F01/F02/F03 | 8557–8558 |
| 52 | F03: \(\sqrt{(e^{2x}+1)^2}=e^{2x}+1\) | 8558 |
| 53–57 | F04; nested roots/exponentials, affine logs | 8559 |
| 58–67 | F05 binomial-power substitution | 8561 |
| 68–69 | F06 affine quadratic | 8563 |
| 70–72 | F03/F14/F13 respectively | 8563 |
| 73 | F04 then F06 | 8563 |
| 74 | F13 | 8564 |
| 75–76 | F06 | 8564 |
| 77–79 | F03 then F02/F13 | 8564 |
| 80–83 | F06 | 8566 |
| 84–85 | F04 then F06 | 8566 |
| 86 | F06 | 8566 |
| 87–96 | F07 | 8569–8570 |
| 97 | F04 sine then F07 | 8570 |
| 98 | F07 rational quadratic-radical integral | 8570 |
| 99 | F06 | 8570 |
| 100 | F04 \(u=x^2\) then F07 | 8570 |
| 101–105 | F07, with numerator splitting for 104 | 8570–8571 |
| 106 | F04 \(u=x^2\) then F07 | 8571 |
| 107 | F16/F07 | 8571 |
| 108–114 | F08, distinct real linear factors | 8573 |
| 115–123 | F08, real linear and quadratic factors | 8574–8575 |
| 124–130 | F08, including repeated factors | 8576 |
| 131–148 | F08, division first; note printed correction at 139 | 8577–8578 |
| 149–156 | F08, factorization/rational-root candidates | 8581 |
| 157–166 | F06, derivative-plus-remainder numerator | 8583 |
| 167 | F10 | 8585 |
| 168–169 | F11, with \(u=\cos x\) for 169 | 8585 |
| 170 | F05; parts optional | 8585 |
| 171 | F10 | 8585 |
| 172 | F05 | 8585 |
| 173 | F04 \(u=\ln x\), then F01 | 8585 |
| 174 | F10 | 8585 |
| 175 | F11+F17 | 8585 |
| 176 | F12 | 8586 |
| 177 | F11 | 8586 |
| 178–179 | F12 | 8586 |
| 180–187 | F11+F08/F06; enforce log domains | 8586–8587 |
| 188–190 | F10 cyclic parts/exponential-trig | 8587–8588 |
| 191 | F13 | 8588 |
| 192 | F14 | 8588 |
| 193 | F04 \(u=x^4\), then F14 | 8590 |
| 194–200 | F10; simplify 200 first | 8590–8591 |
| 201–207 | F13+F03 | 8592 |
| 208–216 | F14 | 8593–8594 |
| 217–219 | F19 | 8595 |
| 220–223 | F15 product-to-sum | 8596 |
| 224–235 | F15 rational trig; identities can shorten some cases | 8597–8598 |
| 236–241 | F16+F07/F08 | 8599–8600 |
| 242 | F16 reciprocal-quartic substitution | 8600 |
| 243–244 | F16+F07/F08 | 8600 |
| 245–251 | F17 with F01/F02/F03 | 8601 |
| 252–257 | F17 absolute-value splitting | 8603 |
| 258 | F17 reflection of \(\ln(1+\tan x)\) | 8605 |
| 259 | F18 complementary tangent powers | 8605 |
| 260 | F18 or F20; check endpoints and exponential scale | 8605 |
| 261–262 | F18 complementary ratios/exponentials | 8605 |
| 263 | F17 reflection, then \(u=\cos x\), F06 | 8606 |
| 264 | F17 reflection changes the logarithm's sign | 8606 |
| 265 | F17 reflection+F19 quadratic-trig denominator | 8606 |
| 266–269 | F18 with polynomial, \(x\sin x\), or radical even numerator | 8608 |

## 4. Individual coverage index for mixed exercises 270–438

The photo number is the numeric part of `IMG_NNNN.HEIC`. Each row identifies the parameterized family above and the useful first operation. This includes the non-integral tasks 436–437.

| No. | Family/first operation | Photo |
|---|---|---|
|270|F06 linear over quadratic|8609|
|271|F07 polynomial over circle radical|8609|
|272|F13/F05: save cos, \(u=\sin x\)|8609|
|273|F03+F04: factor \((1-x^2)(1+\arcsin x)\)|8609–8610|
|274|F03 logarithmic derivative of \(\sin x+\cos x\)|8609|
|275|F15+F17 ratio of shifted sines|8609|
|276|F20 \(u=e^x\), then F12|8609|
|277|F07 shifted quadratic root|8609|
|278|F08|8609|
|279|F06|8609|
|280|F05 \(u=\sqrt x\), then F06|8609|
|281|F04 sine, then F07|8609|
|282|F11 affine log|8609|
|283|F04 \(u=\sqrt x\), then F02 secant|8609|
|284|F07 completed square|8609|
|285|F06|8610|
|286|F08 quartic; real quadratic factors|8610–8611|
|287|F15 divide by \(\cos^2x\), then F06/F08|8610|
|288|F05 root variable, then F08|8610|
|289|F08 division first|8610|
|290|F07 shift \(x-3\), split numerator|8610|
|291|F14 tangent reduction|8610|
|292|F07 quadratic root|8611|
|293|F07 quadratic root|8611|
|294|F13 even powers|8611|
|295|F17 reflection+F19|8611|
|296|F04 \(x=\tan t\), then F17 reflection|8611–8612|
|297|F23 exact series; printed elementary key is not reliable|8611|
|298|F06/F08|8611|
|299|F02+F03 exponential square expansion|8612|
|300|F08 biquadratic factorization|8612|
|301|F08; also \(u=x^8\) after extracting \(1/x\)|8612|
|302|F07|8612|
|303|F07|8612|
|304|F15 half-angle for \(2x\)|8612|
|305|F01|8612|
|306|F03 geometric quotient in \(e^x\), then F02|8613|
|307|F13 half-angle|8613|
|308|F02 affine log|8613|
|309|F11 parts|8613|
|310|F09 or F08|8613–8614|
|311|F09 or F08|8613|
|312|F07 split numerator after shift|8613|
|313|F12 arcsec; distinguish positive/negative branches|8613|
|314|F13 odd cosine|8613|
|315|F08 factor polynomial first|8613|
|316|F07/F16 rational quadratic-radical integral|8613|
|317|F08|8613|
|318|Parts: F02 primitive secant, then F02 secant integral|8613|
|319|F04 \(u=\sin x\), then F13|8614|
|320|F02+F17|8614|
|321|F20 \(u=e^x\), then F07|8614|
|322|F12 polynomial times arctan|8614|
|323|F07 derivative-plus-remainder numerator|8614|
|324|F04 logarithmic derivative|8614|
|325|F03/F02, then F17|8614|
|326|F04 \(u=e^{x^2}\), then F06|8615|
|327|F10|8615|
|328|F03+F07: \(u=\cos x\), \(\cos2x=2u^2-1\)|8615|
|329|F18 even cosine numerator; value is not zero|8615|
|330|F10+F17|8615|
|331|F05 \(u=2-x^3\)|8615|
|332|F07|8615|
|333|F06|8615|
|334|F06|8615|
|335|F08 division first|8615|
|336|F17 absolute quadratic|8615|
|337|F16/F07|8615|
|338|F04 log derivative|8615|
|339|F01 divide by monomial|8615|
|340|F04 power substitution|8616|
|341|F15 phase shift or half-angle|8616|
|342|F05 root substitution+F17|8616|
|343|F14 rational tangent power, then F08|8616–8617|
|344|F01/F08 after \(u=x-1\)|8616|
|345|F04 exponential derivative match|8616|
|346|F04 \(u=x^2+1\), then F13|8616|
|347|F09 repeated factors \((x-1)^2(x+1)^5\)|8616|
|348|F20 \(u=e^x\), then F12; real domain \(x\le0\)|8616|
|349|F04 \(u=x^2\), then F06|8616|
|350|F05 root substitution, then F06|8616|
|351|F05 root substitution, then affine log|8616|
|352|F04 \(u=4+\tan x\)|8616|
|353|F07|8616|
|354|F20 multiply by \(e^{4x}\), then arctan|8618|
|355|F07 shift \(x+4\), split numerator|8618|
|356|F10|8618|
|357|F05 affine root|8618|
|358|F03 \(\sin2x=2\sin x\cos x\); F04 then F08|8618|
|359|F12|8618|
|360|F11 polynomial times log ratio|8618|
|361|F07 power −3/2 of quadratic|8618|
|362|F07 shift then split numerator|8618|
|363|F07; same family as 323|8618|
|364|F10, Euler formula or cyclic parts|8618–8619|
|365|F08 division first|8618|
|366|F07 quadratic power −3/2 and split numerator|8618|
|367|F08 repeated linear factor|8618|
|368|F08 division and cubic factorization|8618|
|369|F03 simplify exponentials, then F02/F17|8618|
|370|F06|8620|
|371|F15 general rational trig|8620|
|372|F10|8620|
|373|F10|8620|
|374|F08 even rational function|8620|
|375|F08 quartic factorization|8620|
|376|F12 parts with rational weight, then F08|8620|
|377|F02+F03; same exponential-square family as 299|8620|
|378|F02 reciprocal sine squared|8620|
|379|F11 polynomial times affine log|8620|
|380|F03 four-factor perfect square; stated \(x\ge-3\)|8620–8621|
|381|F16 conjugate rationalization, then F05/F08|8620|
|382|F15 tangent substitution|8620|
|383|F06|8620|
|384|F07|8620|
|385|F07|8622|
|386|F04 \(u=1-\cos2x\)|8622|
|387|F04 \(u=\cos x+6\)|8622|
|388|F02 affine log|8622|
|389|F04 \(u=x^2\), then F08|8622|
|390|F04 exact logarithmic derivative|8622|
|391|F07 split constant and derivative numerator|8622|
|392|F13 odd sine power|8622|
|393|F21 total derivative+F17|8622|
|394|F19 logarithmic endpoint integral|8622–8625|
|395|F16 conjugate rationalization+F17|8622|
|396|F10|8622|
|397|F25 nested-radical limit|8622|
|398|F04 \(u=\sin x-\cos x\), then F06/F17|8622|
|399|F12 parts with weight \(x^{-2}\)|8622|
|400|F01 finite product expansion|8625|
|401|F01/F08: \(u=1-x\), expand numerator|8625|
|402|F04 \(u=\sin^2x\), then F07|8625|
|403|F08 division and repeated factors|8625|
|404|F20 logarithmic oscillation, then F10/F17|8625|
|405|F08 roots of \(x^5+1\), conjugate pairing|8625–8627|
|406|F08|8625|
|407|F06|8625|
|408|F06|8625|
|409|F17 odd function; verify real radicand first|8625|
|410|F03 \(1-\cos2x=2\sin^2x\), then F04|8628|
|411|F10 polynomial times \(e^{-2x}\)|8628|
|412|F10 polynomial times exponential-sine|8628|
|413|F07|8628|
|414|F19 quadratic-trig ratio or F15+F17|8628|
|415|F08 repeated quadratic/linear factors|8628|
|416|F08; same denominator as 415|8628|
|417|F22 power/log parameter family|8628–8631|
|418|F16 conjugate, then F07|8628|
|419|F08 biquadratic|8628|
|420|F04 \(u=x^n\), then F08; special case \(n=0\)|8628|
|421|F05 affine root|8628|
|422|F04 \(u=2+5\cos x\)|8628|
|423|F22 arctangent difference|8631|
|424|F22 logarithmic rational moment|8631|
|425|F22 damped sine limit|8631|
|426|F22 log affine cosine|8631|
|427|F23 sine integral/entire series|8636|
|428|F24 dilog or convergent log series|8636|
|429|F24 inverse-tangent integral/series|8636|
|430|F23 exponential-minus-one kernel|8636|
|431|F23 one-minus-exponential kernel|8636|
|432|F23 sine integral minus elementary log on positive bounds|8636|
|433|F24 difference of exponential-log integrals|8639|
|434|F24 plus-sign exponential log|8639|
|435|F24 with \(k=\ln2\); combine logs before integration|8639|
|436|F24 special value \(\operatorname{Li}_2(i)\)|8639|
|437|F24 derivative and chain rule; correct printed sign|8639|
|438|F24 inverse-tangent integral with \(a=3\)|8639|

## 5. Source-specific corrections and safeguards

These selected corrections are included because they materially affect how a family should be generalized. They are not an exhaustive errata list.

### 31 — the missing absolute value changes the answer

The source integrand is \(\sqrt{e^{2x}-6e^x+9}=|e^x-3|\). A continuous global primitive is
\[
F(x)=\begin{cases}
3x-e^x,&x\le\ln3,\\
e^x-3x+6\ln3-6,&x\ge\ln3,
\end{cases}+C.
\]
The key's \(e^x-3x+C\) works only on the upper-sign interval. Contrast 52, whose square root is \(|e^{2x}+1|=e^{2x}+1\) everywhere.

### 139 — honor the visible correction

The photo contains an annotation correcting an exponent in the numerator to 3. Use that annotation when transcribing the exercise; do not silently use the uncorrected exponent. The general family remains F08 either way.

### 242 — reciprocal substitution introduces a chart point

For the printed integrand a local primitive is
\[
\frac1{\sqrt2}\arctan\frac{\sqrt{x^4+1}}{\sqrt2 x}+C,\quad x\ne0.
\]
The original integrand is defined at zero, but this formula has different limiting constants from the two sides. Add \(\pi/\sqrt2\) to its negative-x branch and define the common value at zero to obtain a continuous primitive across zero. Differentiate the original expression to confirm; never confuse a substitution singularity with a singularity of the original integrand.

### 297 — do not trust the finite elementary-looking key

The printed integrand is \((\cos(x^3)-4)/x^2\). A substitution \(u=x^3\) does not leave a constant differential weight. Use the exact series in F23 or a correctly specified special-function expression. A finite expression in the key must pass differentiation; it cannot be accepted because it appears in an answer table.

### 329 — symmetry gives a nonzero answer

The photographed exercise is
\[
\int_{-\pi/4}^{\pi/4}\frac{\cos x}{6^x+1}dx
=\frac12\int_{-\pi/4}^{\pi/4}\cos x\,dx=\frac{\sqrt2}{2}.
\]
The printed key's zero is incorrect. The numerator is even, not odd.

### 380 — generalizing the square-root shortcut requires a sign split

Here \((x+3)(x+4)(x+5)(x+6)+1=(x^2+9x+19)^2\). The source specifies \(x\ge-3\), where \(x^2+9x+19>0\), so \(x^3/3+9x^2/2+19x+C\) is valid on that restricted interval. On all real x, use \(|x^2+9x+19|\) and split at \((-9\pm\sqrt5)/2\). The answer is not an arbitrary ± choice.

### 386 — a chain-rule square, not just a sine primitive

\[
\int 2\sin(2x)[1-\cos(2x)]dx=\frac12[1-\cos(2x)]^2+C.
\]
This is a useful regression example for F04. The printed \(2\sin^2x\) key does not differentiate to the stated integrand.

### 393 — an exact answer is available

Using F21, \(\int_{\pi/2}^{\pi} e^x(1-\sin x)/(1-\cos x)\,dx=e^{\pi/2}\), since the primitive is \(-e^x\cot(x/2)\). This agrees with the printed decimal key; the improvement here is an exact answer, not a correction to its numerical value.

### 397 — fixed point is not proof of convergence

Use the finite-radical sequence in F25. Do not infer the infinite expression from \(R^2=xR\) without selecting the limit and real domain.

### 409 — parity also needs a real integrand

\(x\sqrt{x^2+\cos x}\) is odd. Its radicand is positive for all real x: if \(|x|\ge1\), use \(x^2+\cos x\ge x^2-1\), with strict positivity at \(x=\pm1\); if \(|x|<1\), \(\cos x>0\). Hence its symmetric definite integral really is zero.

### 414 — the numerator matters

The printed integral is \(\int_0^{\pi/2}\cos^2x/(\cos^2x+4\sin^2x)\,dx=\pi/6\), using F19 with \(a=1,b=2\). The related integral with numerator 1 is \(\pi/4\); do not conflate them.

### 420 — parameter-zero and a wrong general-looking key

For real \(n\ne0\), on a valid power domain,
\[
\int\frac{x^{2n-1}}{x^n+1}dx=\frac{x^n-\ln|x^n+1|}{n}+C.
\]
For \(n=0\), the original integrand is \(1/(2x)\), giving \(\tfrac12\ln|x|+C\). For general real \(n\), choose \(x>0\); integers allow the usual larger domains. The photographed key is not this correct rational-substitution result. Parameter-dependent constants may be subtracted before taking \(n\to0\); the raw displayed formula need not have a finite limit.

### 437 — the proposed identity has the wrong sign

By the chain rule,
\[
-\frac{\operatorname{Log}(1-1/z)}{1/z}\left(-\frac1{z^2}\right)
=+\frac{\operatorname{Log}(1-1/z)}z.
\]
Thus the negative sign in the requested printed identity is false. Explain the correction instead of “proving” a false statement.

### General answer-key warning

Other photographed entries show apparent omissions or mismatches. This guide deliberately does not certify them. Use the source integrand and derivative checks as the authority. In particular, distinguish an antiderivative of a quadratic square root from an antiderivative of its reciprocal; their formulas are not interchangeable.

## 6. A concrete protocol for extending or teaching the book

For each exercise or requested general family:

1. **Record the literal problem.** Include its number, photo, integrand, variable, bounds, and any printed parameter/domain conditions. Flag an unclear symbol instead of guessing.
2. **Normalize without losing the domain.** List original exclusions; simplify; test square roots of squares; check whether an apparent singularity is removable.
3. **Choose the narrow useful family.** Start with elementary structure-preserving parameter changes. For example, change \(x^3\sqrt{x^2+1}\) to \(x^{2k+1}(A+Bx^2)^p\), not an unrestricted \(f(x)\sqrt{g(x)}\).
4. **State the wider boundary.** Explain what happens if exponents cease to be integers, roots merge, derivative matching fails, bounds cross poles, or symmetry is broken. Identify when special functions or numerical integration replace a finite elementary answer.
5. **Derive one reusable result.** Use the parameterized substitution/reduction/algorithm, then recover the original by substitution of its constants.
6. **Enumerate actual exceptions.** At minimum: all divided-by parameters equal to zero; exponent −1; discriminant zero; canceled factors; real-branch restrictions; convergence boundaries; coincident frequencies/factors.
7. **Verify.** Differentiate a symbolic candidate under its assumptions. For definite integrals, check integrability before applying endpoints and compare with independent high-precision quadrature where practical.
8. **Present a short worked specialization and a counterexample.** Show both a case where the shortcut works and a nearby case where it fails. Do not let the counterexample replace the general derivation.

Suggested progression: F01–F05 → F06–F09 → F10–F16 → F17–F21 → F22–F25. If tutoring, stop for the student's attempt at each meaningful step. If generating a reference manual, provide the complete derivations and explicit case tables.

## 7. Verification scope and reference notes

The coverage index was checked programmatically to include exercise numbers 1–438 exactly once across its two tables. Representative formulas and highlighted corrections were checked by symbolic differentiation and/or numerical quadrature; this does not constitute 438 individually solved and audited exercises. The guide gives a solution family or algorithm for every exercise and calls out special cases where a simple elementary template is inappropriate.

External reference checks for the special-function definitions and branch conventions:

- NIST Digital Library of Mathematical Functions, §8.17, incomplete beta definition and beta/gamma relation: https://dlmf.nist.gov/8.17
- NIST Digital Library of Mathematical Functions, §25.12, dilogarithm series, integral definition, and principal branch: https://dlmf.nist.gov/25.12

The elementary formulas, family reductions, source mappings, and correction calculations above were developed directly from the supplied photographs and standard differentiation/substitution, rather than copied from the book's prose or answer key.
