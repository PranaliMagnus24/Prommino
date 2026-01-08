<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>Prominno</title>
    <link rel="stylesheet" href="{{ asset('admin/assets/css/index.css') }}">
</head>

<body>
    <section>
        <div class="form-box">
            <div class="form-value">
                <form action="{{ route('login') }}" method="POST">
                    @csrf
                    <h2>Login</h2>
                    <div class="inputbox">
                        <ion-icon name="mail-outline"></ion-icon>
                        <input type="email" name="email" value="{{ old('email') }}">
                        <label for="">Email</label>
                        @error('email')
                            <span class="text-danger">{{ $message }}</span>
                        @enderror
                    </div>
                    <div class="inputbox">
                        <ion-icon name="lock-closed-outline"></ion-icon>
                        <input type="password" name="password">
                        <label for="">Password</label>
                    </div>
                    <div class="forget">
                        <label><input type="checkbox" id="remember_me">Remember Me</label>
                        <a href="{{ route('password.request') }}">Forgot password?</a>
                    </div>
                    <button>Log in</button>
                </form>
            </div>
        </div>
    </section>
    <script type="module" src="https://unpkg.com/ionicons@5.5.2/dist/ionicons/ionicons.esm.js"></script>
    <script nomodule src="https://unpkg.com/ionicons@5.5.2/dist/ionicons/ionicons.js"></script>
</body>

</html>
