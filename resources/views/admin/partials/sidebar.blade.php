<!-- ================= SIDEBAR (DESKTOP) ================= -->
<nav class="col-md-2 d-none d-md-block bg-dark sidebar bottom-0 top-0 py-5 px-2">
    <div class="sidebar-sticky vh-100 overflow-auto pt-1">
        <ul class="nav flex-column">
            @php
                $user = Auth::user();
            @endphp
            @if ($user && $user->role === 'admin')
                <li class="nav-item">
                    <a class="nav-link text-light" href="{{ route('users.index') }}"><i
                            class="ri-file-list-2-line me-2"></i> Users</a>
                </li>
            @endif
            @if (($user && $user->role === 'admin') || $user->role === 'seller')
                <li class="nav-item">
                    <a class="nav-link text-light" href="{{ url('/products') }}"><i
                            class="ri-shopping-cart-2-line me-2"></i>
                        Products</a>
                </li>
            @endif
        </ul>
    </div>
</nav>

<!-- ================= MOBILE SIDEBAR ================= -->
<div class="offcanvas offcanvas-start bg-dark text-light" id="mobileSidebar">
    <div class="offcanvas-header">
        <h5>Navigation</h5>
        <button class="btn-close btn-close-white" data-bs-dismiss="offcanvas"></button>
    </div>
    <div class="offcanvas-body">
        <ul class="nav flex-column">
            <li class="nav-item">
                <a class="nav-link text-light" href="{{ route('dashboard') }}">
                    <i class="ri-dashboard-line me-2"></i> Dashboard
                </a>
            </li>
            @if ($user && $user->role === 'admin')
                <li class="nav-item">
                    <a class="nav-link text-light" href="{{ route('users.index') }}"><i
                            class="ri-file-list-2-line me-2"></i> Users</a>
                </li>
            @endif
            @if (($user && $user->role === 'admin') || $user->role === 'seller')
                <li class="nav-item">
                    <a class="nav-link text-light" href="{{ url('/products') }}"><i
                            class="ri-shopping-cart-2-line me-2"></i>
                        Products</a>
                </li>
            @endif
        </ul>
    </div>
</div>
